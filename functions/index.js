
const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const { FormData, Blob } = require("node-fetch");

// Use a specific region for your functions
const regionalFunctions = functions.region("us-central1");

// Initialize Firebase Admin SDK
admin.initializeApp();
// **CRUCIAL**: Explicitly select the 'alzadatos' database.
// The (default) database is not used in this project.
const db = admin.firestore();


// =======================================================================================
// TEST FUNCTION TO DEBUG DATABASE CONNECTION - THIS WILL BE REMOVED LATER
// =======================================================================================
exports.testDatabaseWrite = regionalFunctions.https.onCall(async (data, context) => {
    console.log("[DB_TEST_LOG] Starting testDatabaseWrite function call...");
    try {
        // Explicitly point to the 'alzadatos' database for this test.
        const alzaDb = admin.firestore();
        const testRef = alzaDb.collection("test_logs").doc("test_doc");
        console.log("[DB_TEST_LOG] Attempting to write to 'test_logs/test_doc' in alzadatos...");
        await testRef.set({
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            message: "Test write from Cloud Function was successful!",
            database: alzaDb.databaseId, 
        });
        console.log("[DB_TEST_LOG] SUCCESS: Document written successfully!");
        return { success: true, message: "Test document written successfully!" };
    } catch (error) {
        console.error("[DB_TEST_LOG] CRITICAL ERROR during test write:", error);
        throw new functions.https.HttpsError('internal', 'Test write to database failed.', error.message);
    }
});
// =======================================================================================


// DEPRECATED - This function is no longer used by the new flow.
exports.generateUploadUrl = regionalFunctions.https.onCall(async (data, context) => {
    console.log("[DEPRECATED_FUNCTION_LOG] generateUploadUrl was called but is deprecated.");
    throw new functions.https.HttpsError('unimplemented', 'This function is deprecated.');
});


exports.verifyIdFromApp = regionalFunctions.https.onCall(async (data, context) => {
    console.log("[ID_APP_VERIFY_LOG] Starting verifyIdFromApp function call...");
    const { cedula, idImageBase64 } = data;

    if (!cedula || !idImageBase64) {
        console.error("[ID_APP_VERIFY_LOG] ERROR: The function must be called with 'cedula' and 'idImageBase64'.");
        throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters.');
    }
    
    console.log(`[ID_APP_VERIFY_LOG] Received cedula: ${cedula}`);
    const verificationRef = db.collection("verifications").doc();
    const verificationId = verificationRef.id;

    try {
        const bucket = admin.storage().bucket();
        const filePath = `verifications/${verificationId}/id_image.jpg`;
        const file = bucket.file(filePath);
        
        const base64EncodedImageString = idImageBase64.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64EncodedImageString, 'base64');
        
        console.log(`[ID_APP_VERIFY_LOG] Uploading ID image to: ${filePath}`);
        await file.save(imageBuffer, {
            metadata: { contentType: 'image/jpeg' },
        });
        
        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: '03-09-2491'
        });

        console.log(`[ID_APP_VERIFY_LOG] Image uploaded. Download URL: ${url}`);
        
        const docData = {
            cedula: cedula,
            idImageUrl: url,
            status: "pending-selfie",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        console.log(`[ID_APP_VERIFY_LOG] Writing verification document to Firestore with ID: ${verificationId}`);
        await verificationRef.set(docData);

        console.log(`[ID_APP_VERIFY_LOG] SUCCESS for verificationId: ${verificationId}`);
        return { success: true, verificationId: verificationId };

    } catch (error) {
        console.error('[ID_APP_VERIFY_LOG] CRITICAL ERROR:', error);
        throw new functions.https.HttpsError('internal', 'Could not complete verification process.');
    }
});


exports.runIdentityCheck = regionalFunctions.https.onCall(async (data, context) => {
    const { verificationId } = data;

    if (!verificationId) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with a "verificationId".');
    }

    console.log(`[ID_CHECK_FUNCTION] Starting verification for ID: ${verificationId}`);
    const verificationRef = db.collection("verifications").doc(verificationId);

    try {
        // 1. Get the verification data from Firestore
        console.log("[ID_CHECK_FUNCTION] Fetching verification document from Firestore...");
        const docSnap = await verificationRef.get();
        if (!docSnap.exists) {
            throw new functions.https.HttpsError('not-found', `Verification document with ID ${verificationId} not found.`);
        }
        const verificationData = docSnap.data();
        console.log("[ID_CHECK_FUNCTION] Verification document found. Status: ", verificationData.status);

        if (verificationData.status !== 'pending-verification') {
            throw new functions.https.HttpsError('failed-precondition', `Verification document is not in the correct state. Status: ${verificationData.status}`);
        }

        // 2. Prepare data for the external API
        console.log("[ID_CHECK_FUNCTION] Preparing data for external API call...");
        if (!VERIFICATION_API_KEY) {
             console.error("[ID_CHECK_FUNCTION] CRITICAL: Missing VERIFICATION_API_KEY in environment configuration.");
             throw new functions.https.HttpsError('internal', 'Server configuration is incomplete.');
        }

        const formData = new FormData();
        formData.append('cedula', verificationData.cedula);
        formData.append('api_key', VERIFICATION_API_KEY);

        // Fetch images from URLs and convert them to Blobs
        console.log("[ID_CHECK_FUNCTION] Fetching ID image from URL:", verificationData.idImageUrl);
        const idImageResponse = await fetch(verificationData.idImageUrl);
        const idImageArrayBuffer = await idImageResponse.arrayBuffer();
        const idImageBlob = new Blob([idImageArrayBuffer], { type: idImageResponse.headers.get('content-type') });
        formData.append('id_image', idImageBlob, 'id_image.jpg');

        console.log("[ID_CHECK_FUNCTION] Fetching selfie image from URL:", verificationData.selfieUrl);
        const faceImageResponse = await fetch(verificationData.selfieUrl);
        const faceImageArrayBuffer = await faceImageResponse.arrayBuffer();
        const faceImageBlob = new Blob([faceImageArrayBuffer], { type: faceImageResponse.headers.get('content-type') });
        formData.append('face_image', faceImageBlob, 'face_image.jpg');

        // 3. Call external API
        const apiUrl = "http://93.127.132.230:8000/verify";
        console.log(`[ID_CHECK_FUNCTION] Calling external API at ${apiUrl} for verificationId: ${verificationId}`);
        const response = await fetch(apiUrl, {
            method: 'POST',
            body: formData,
            headers: formData.getHeaders ? formData.getHeaders() : {},
        });

        const responseData = await response.json();
        console.log("[ID_CHECK_FUNCTION] API Response Status:", response.status);
        console.log("[ID_CHECK_FUNCTION] API Response Body:", JSON.stringify(responseData, null, 2));

        // 4. Update Firestore with the result
        if (!response.ok) {
            console.error("[ID_CHECK_FUNCTION] API call failed.");
            await verificationRef.update({
                status: 'failed',
                apiResponse: responseData,
                error: `API Error: ${response.statusText}`,
            });
             throw new functions.https.HttpsError('internal', responseData.detail || `API Error: ${response.statusText}`);
        }

        // 5. On success, update the user profile as well if verification passed
        if (responseData.verification_passed) {
            console.log("[ID_CHECK_FUNCTION] Verification passed. Updating user profile...");
            const userDocRef = db.collection("users").doc(responseData.document_info.cedula);
            const userSnap = await userDocRef.get();

            const profileData = {
                name: responseData.document_info.nombre_completo,
                cedula: responseData.document_info.cedula,
                birthDate: responseData.document_info.fecha_nacimiento,
            };

            if (userSnap.exists) {
                console.log(`[ID_CHECK_FUNCTION] User ${profileData.cedula} exists, updating profile.`);
                await userDocRef.update(profileData);
            } else {
                console.log(`[ID_CHECK_FUNCTION] User ${profileData.cedula} does not exist, creating new profile.`);
                await userDocRef.set({
                    ...profileData,
                    role: 'Cliente',
                    status: 'Activo',
                    since: new Date().toLocaleDateString('es-DO'),
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        } else {
            console.log("[ID_CHECK_FUNCTION] Verification did not pass according to API response.");
        }

        console.log("[ID_CHECK_FUNCTION] Updating verification document to 'completed'.");
        await verificationRef.update({
            status: 'completed',
            apiResponse: responseData,
        });

        console.log("[ID_CHECK_FUNCTION] Process completed successfully.");
        return { success: true, message: "Verification completed successfully.", apiResponse: responseData };

    } catch (error) {
        console.error("[ID_CHECK_FUNCTION] CRITICAL - Error during verification process: ", error);
        if (error instanceof functions.https.HttpsError) {
            await verificationRef.update({ status: 'failed', error: error.message }).catch(e => console.error("Failed to write failure state to doc", e));
            throw error; // Re-throw HttpsError
        }
        // For other types of errors
        await verificationRef.update({ status: 'failed', error: 'An unexpected error occurred.' }).catch(e => console.error("Failed to write failure state to doc", e));
        throw new functions.https.HttpsError('internal', 'An unexpected error occurred during verification.');
    }
});
