
const functions = require("firebase-functions/v1");
const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const fetch = require("node-fetch");
const FormData = require("form-data"); // <--- IMPORTACIÓN CORREGIDA
const { Storage } = require("@google-cloud/storage");


// Use a specific region for your functions
const regionalFunctions = functions.region("us-central1");

// Initialize Firebase Admin SDK with custom database
const app = initializeApp({
  credential: applicationDefault(),
  projectId: "equipotrack-qdywm",
  storageBucket: "equipotrack-qdywm.firebasestorage.app",
});

const db = getFirestore(app, "alzadatos"); // 👈 conecta a la base alzadatos
const storage = getStorage(app);


// =======================================================================================
// TEST FUNCTION TO DEBUG DATABASE CONNECTION
// =======================================================================================
exports.testDatabaseWrite = regionalFunctions.https.onCall(async (data, context) => {
  console.log("[DB_TEST_LOG] Starting testDatabaseWrite function call...");
  try {
    const testRef = db.collection("test_logs").doc("test_doc");
    console.log("[DB_TEST_LOG] Attempting to write to 'test_logs/test_doc'...");
    await testRef.set({
      timestamp: FieldValue.serverTimestamp(),
      message: "Test write from Cloud Function was successful!",
    });
    console.log("[DB_TEST_LOG] SUCCESS: Document written successfully!");
    return { success: true, message: "Test document written successfully!" };
  } catch (error) {
    console.error("[DB_TEST_LOG] CRITICAL ERROR during test write:", error);
    throw new functions.https.HttpsError("internal", "Test write to database failed.", error.message);
  }
});
// =======================================================================================


// DEPRECATED - This function is no longer used by the new flow.
exports.generateUploadUrl = regionalFunctions.https.onCall(async (data, context) => {
  console.log("[DEPRECATED_FUNCTION_LOG] generateUploadUrl was called but is deprecated.");
  throw new functions.https.HttpsError("unimplemented", "This function is deprecated.");
});


exports.verifyIdFromApp = regionalFunctions.https.onCall(async (data, context) => {
  console.log("[ID_APP_VERIFY_LOG] Starting verifyIdFromApp function call...");
  const { cedula, idImageBase64 } = data;


  if (!cedula || !idImageBase64) {
    console.error("[ID_APP_VERIFY_LOG] ERROR: The function must be called with 'cedula' and 'idImageBase64'.");
    throw new functions.https.HttpsError("invalid-argument", "Missing required parameters.");
  }
  
  console.log(`[ID_APP_VERIFY_LOG] Received 2 cedula: ${cedula}`);
  const verificationRef = db.collection("verifications").doc();
  const verificationId = verificationRef.id;

  

  try {
    console.log("[ID_APP_VERIFY_LOG] DEBUG: Listing available Storage buckets...");
    try {
      const gcs = new Storage();
      const [buckets] = await gcs.getBuckets();
      if (buckets.length === 0) {
        console.log("[ID_APP_VERIFY_LOG] DEBUG: No Storage buckets found for this project/service account.");
      } else {
        console.log("[ID_APP_VERIFY_LOG] DEBUG: Found the following Storage buckets:");
        buckets.forEach(bucket => {
          console.log(`- ${bucket.name}`);
        });
      }
    } catch (listError) {
      console.error("[ID_APP_VERIFY_LOG] DEBUG ERROR: Failed to list buckets:", listError);
    };
    console.log(`[ID_APP_VERIFY_LOG] Attempting to upload ID image mio to Firebase Storage...`);
    const bucket = storage.bucket("equipotrack-qdywm.firebasestorage.app"); 
    const filePath = `verifications/${verificationId}/id_image.jpg`;
    const file = bucket.file(filePath);
    
    const base64EncodedImageString = idImageBase64.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64EncodedImageString, "base64");
    
    console.log(`[ID_APP_VERIFY_LOG] Uploading ID image to: ${filePath}`);
    await file.save(imageBuffer, {
      metadata: { contentType: "image/jpeg" },
    });
    
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: new Date('2491-09-03'), // Formato correcto para la fecha de expiración
    });

    console.log(`[ID_APP_VERIFY_LOG] Image uploaded. Download URL: ${url}`);
    
    const docData = {
      cedula: cedula,
      idImageUrl: url,
      status: "pending-selfie",
      createdAt: FieldValue.serverTimestamp(),
    };

    console.log(`[ID_APP_VERIFY_LOG] Writing verification document to Firestore with ID: ${verificationId}`);
    await verificationRef.set(docData);

    console.log(`[ID_APP_VERIFY_LOG] SUCCESS for verificationId: ${verificationId}`);
    return { success: true, verificationId: verificationId };

  } catch (error) {
    console.error("[ID_APP_VERIFY_LOG] CRITICAL ERROR:", error);
    throw new functions.https.HttpsError("internal", "Could not complete verification process.");
  }
});






exports.runIdentityCheck = regionalFunctions.https.onCall(async (data, context) => {
  const { verificationId } = data;

  if (!verificationId) {
    throw new functions.https.HttpsError("invalid-argument", 'The function must be called with a "verificationId".');
  }

  console.log(`[ID_CHECK_FUNCTION] Starting verification for ID: ${verificationId}`);
  const verificationRef = db.collection("verifications").doc(verificationId);

  try {
    // 1. Get the verification data from Firestore
    console.log("[ID_CHECK_FUNCTION] Fetching verification document from Firestore...");
    const docSnap = await verificationRef.get();
    if (!docSnap.exists) {
      throw new functions.https.HttpsError("not-found", `Verification document with ID ${verificationId} not found.`);
    }
    const verificationData = docSnap.data();
    console.log("[ID_CHECK_FUNCTION] Verification document found. Status: ", verificationData.status);

    if (verificationData.status !== "pending-verification") {
      throw new functions.https.HttpsError("failed-precondition", `Verification document is not in the correct state. Status: ${verificationData.status}`);
    }

    const apiKey = functions.config().verification.api_key;
    console.log("[ID_CHECK_FUNCTION] API Key:", apiKey);
    if (!apiKey) {
      console.error("[ID_CHECK_FUNCTION] CRITICAL: Missing VERIFICATION_API_KEY in environment configuration.");
      throw new functions.https.HttpsError("internal", "Server configuration is incomplete.");
    }

    // CREAR FORMDATA SIN API KEY (va como header)
    const formData = new FormData();
    formData.append("cedula", verificationData.cedula);
    // ❌ QUITAR ESTA LÍNEA: formData.append("api_key", apiKey);

    console.log("[ID_CHECK_FUNCTION] Fetching ID image from URL:", verificationData.idImageUrl);
    const idImageResponse = await fetch(verificationData.idImageUrl);
    
    // Verificar que la imagen se descargó correctamente
    if (!idImageResponse.ok) {
      throw new functions.https.HttpsError("internal", `Failed to fetch ID image: ${idImageResponse.statusText}`);
    }
    
    const idImageBuffer = await idImageResponse.buffer();
    
    // SINTAXIS CORRECTA PARA form-data
    formData.append("id_image", idImageBuffer, {
      filename: "id_image.jpg",
      contentType: idImageResponse.headers.get("content-type") || "image/jpeg"
    });
    
    console.log("me detego aqui");
    console.log("[ID_CHECK_FUNCTION] Fetching selfie image from URL:", verificationData.selfieUrl);
    const faceImageResponse = await fetch(verificationData.selfieUrl);
    
    // Verificar que la imagen se descargó correctamente
    if (!faceImageResponse.ok) {
      throw new functions.https.HttpsError("internal", `Failed to fetch selfie image: ${faceImageResponse.statusText}`);
    }
    
    const faceImageBuffer = await faceImageResponse.buffer();
    
    // SINTAXIS CORRECTA PARA form-data
    formData.append("face_image", faceImageBuffer, {
      filename: "face_image.jpg", 
      contentType: faceImageResponse.headers.get("content-type") || "image/jpeg"
    });

    // DEBUG: Verificar qué se está enviando
    console.log("[DEBUG] FormData fields (should NOT include api_key):");
    console.log("- cedula:", verificationData.cedula);
    console.log("- id_image: Buffer", idImageBuffer.length, "bytes");
    console.log("- face_image: Buffer", faceImageBuffer.length, "bytes");

    const apiUrl = "http://93.127.132.230:8000/verify";
    
    console.log(`[ID_CHECK_FUNCTION] Calling external API at ${apiUrl} for verificationId: ${verificationId}`);
    
    // ✅ AGREGAR API KEY COMO HEADER
    const requestHeaders = {
      ...formData.getHeaders(),
      'api-key': apiKey,  // ← ESTA ES LA LÍNEA CLAVE
      'User-Agent': 'Firebase-Function/1.0'
    };
    
    console.log("[ID_CHECK_FUNCTION] Request Headers:", JSON.stringify(requestHeaders, null, 2));

    const response = await fetch(apiUrl, {
      method: "POST",
      body: formData,
      headers: requestHeaders,
    });

    const responseData = await response.json();
    console.log("[ID_CHECK_FUNCTION] API Response Status:", response.status);
    console.log("[ID_CHECK_FUNCTION] API Response Body:", JSON.stringify(responseData, null, 2));

    if (!response.ok) {
      console.error("[ID_CHECK_FUNCTION] API call failed.");
      await verificationRef.update({
        status: "failed",
        apiResponse: responseData,
        error: `API Error: ${response.statusText}`,
      });
      throw new functions.https.HttpsError("internal", responseData.detail || `API Error: ${response.statusText}`);
    }

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
          role: "Cliente",
          status: "Activo",
          since: new Date().toLocaleDateString("es-DO"),
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    } else {
      console.log("[ID_CHECK_FUNCTION] Verification did not pass according to API response.");
    }

    console.log("[ID_CHECK_FUNCTION] Updating verification document to 'completed'.");
    await verificationRef.update({
      status: "completed",
      apiResponse: responseData,
    });

    console.log("[ID_CHECK_FUNCTION] Process completed successfully.");
    return { success: true, message: "Verification completed successfully.", apiResponse: responseData };

  } catch (error) {
    console.error("[ID_CHECK_FUNCTION] CRITICAL - Error during verification process: ", error);
    if (error instanceof functions.https.HttpsError) {
      await verificationRef.update({ status: "failed", error: error.message }).catch(e => console.error("Failed to write failure state to doc", e));
      throw error;
    }
    await verificationRef.update({ status: "failed", error: "An unexpected error occurred." }).catch(e => console.error("Failed to write failure state to doc", e));
    throw new functions.https.HttpsError("internal", "An unexpected error occurred during verification.");
  }
});