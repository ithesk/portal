
const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const { FormData, Blob } = require("node-fetch");

// Use a specific region for your functions
const regionalFunctions = functions.region("us-central1");

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore('alzadatos'); // Use the 'alzadatos' database

// IMPORTANT: Set your API Key as an environment variable in Firebase
// Run this command in your terminal:
// firebase functions:config:set verification.apikey="TU_API_KEY_AQUI"
const VERIFICATION_API_KEY = functions.config().verification.apikey;


exports.generateUploadUrl = regionalFunctions.https.onCall(async (data, context) => {
    const { verificationId, contentType } = data;

    if (!verificationId) {
        throw new functions.https.HttpsError('invalid-argument', 'The function must be called with a "verificationId".');
    }

    const bucket = admin.storage().bucket();
    const filePath = `verifications/${verificationId}/id_image.jpg`;
    const file = bucket.file(filePath);

    // Set options for the signed URL. The URL will be valid for 5 minutes.
    const options = {
        version: 'v4',
        action: 'write',
        expires: Date.now() + 5 * 60 * 1000, // 5 minutes
        contentType: contentType,
    };

    try {
        console.log(`[FUNCTION_LOG] Generating signed URL for: ${filePath}`);
        const [url] = await file.getSignedUrl(options);
        console.log(`[FUNCTION_LOG] generateUploadUrl SUCCESS for verificationId: ${verificationId}`);
        return { success: true, url: url };
    } catch (error) {
        console.error('ERROR: Could not generate signed URL', error);
        throw new functions.https.HttpsError('internal', 'Could not generate file upload URL.');
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
