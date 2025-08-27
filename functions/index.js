
const functions = require("firebase-functions/v1");
const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const fetch = require("node-fetch");
const FormData = require("form-data"); // <--- IMPORTACIÓN CORREGIDA
const { Storage } = require("@google-cloud/storage");
const admin = require("firebase-admin");
const bcrypt = require('bcryptjs');


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
// NEW SMS VERIFICATION FUNCTIONS
// =======================================================================================

exports.sendSmsVerification = regionalFunctions.https.onCall(async (data, context) => {
    const { phoneNumber } = data;

    if (!phoneNumber) {
        throw new functions.https.HttpsError("invalid-argument", "Se requiere el número de teléfono.");
    }

    // 1. Generate a 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const message = `Tu codigo de verificacion para Alza es: ${code}`;

    // 2. Hash the code before storing
    const salt = await bcrypt.genSalt(10);
    const hashedCode = await bcrypt.hash(code, salt);

    // 3. Store hashed code and expiration in Firestore
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // Code expires in 10 minutes

    const verificationRef = db.collection("smsVerifications").doc(phoneNumber);
    await verificationRef.set({
        hashedCode: hashedCode,
        expiresAt: Timestamp.fromDate(expiresAt),
        attempts: 0
    });

    // 4. Call the external SMS API
    const apiKey = functions.config().ithesk.apikey;
    if (!apiKey) {
        console.error("CRITICAL: La API Key para iThesk no está configurada.");
        throw new functions.https.HttpsError("internal", "Error de configuración del servidor.");
    }

    try {
        const response = await fetch("http://sms.ithesk.com/send-sms/", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey,
            },
            body: JSON.stringify({
                number: phoneNumber,
                message: message,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new functions.https.HttpsError("internal", `La API de SMS falló con estado ${response.status}: ${errorBody}`);
        }

        console.log(`Código de verificación enviado a ${phoneNumber}`);
        return { success: true, message: "Código enviado exitosamente." };

    } catch (error) {
        console.error("Error al llamar a la API de SMS:", error);
        if (error instanceof functions.https.HttpsError) {
          throw error;
        }
        throw new functions.https.HttpsError("internal", "No se pudo enviar el mensaje SMS.");
    }
});


exports.verifySmsCode = regionalFunctions.https.onCall(async (data, context) => {
    const { phoneNumber, code } = data;

    if (!phoneNumber || !code) {
        throw new functions.https.HttpsError("invalid-argument", "Se requiere el número de teléfono y el código.");
    }

    const verificationRef = db.collection("smsVerifications").doc(phoneNumber);
    const docSnap = await verificationRef.get();

    if (!docSnap.exists) {
        throw new functions.https.HttpsError("not-found", "No se encontró una solicitud de verificación para este número.");
    }

    const verificationData = docSnap.data();

    // Check expiration
    if (verificationData.expiresAt.toDate() < new Date()) {
        await verificationRef.delete(); // Clean up expired doc
        throw new functions.https.HttpsError("aborted", "El código de verificación ha expirado.");
    }

    // Check attempts
    if (verificationData.attempts >= 5) {
        throw new functions.https.HttpsError("resource-exhausted", "Demasiados intentos fallidos. Por favor, solicita un nuevo código.");
    }

    // Check code
    const isMatch = await bcrypt.compare(code, verificationData.hashedCode);

    if (isMatch) {
        await verificationRef.delete(); // Code used, delete it.
        return { success: true, message: "Código verificado exitosamente." };
    } else {
        // Increment attempts on failure
        await verificationRef.update({ attempts: FieldValue.increment(1) });
        throw new functions.https.HttpsError("invalid-argument", "El código ingresado es incorrecto.");
    }
});


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
    if (!apiKey) {
      console.error("[ID_CHECK_FUNCTION] CRITICAL: Missing VERIFICATION_API_KEY in environment configuration.");
      throw new functions.https.HttpsError("internal", "Server configuration is incomplete.");
    }

    const formData = new FormData();
    formData.append("cedula", verificationData.cedula);
    
    console.log("[ID_CHECK_FUNCTION] Fetching ID image from URL:", verificationData.idImageUrl);
    const idImageResponse = await fetch(verificationData.idImageUrl);
    
    if (!idImageResponse.ok) {
      throw new functions.https.HttpsError("internal", `Failed to fetch ID image: ${idImageResponse.statusText}`);
    }
    
    const idImageBuffer = await idImageResponse.buffer();
    
    formData.append("id_image", idImageBuffer, {
      filename: "id_image.jpg",
      contentType: idImageResponse.headers.get("content-type") || "image/jpeg"
    });
    
    console.log("[ID_CHECK_FUNCTION] Fetching selfie image from URL:", verificationData.selfieUrl);
    const faceImageResponse = await fetch(verificationData.selfieUrl);
    
    if (!faceImageResponse.ok) {
      throw new functions.https.HttpsError("internal", `Failed to fetch selfie image: ${faceImageResponse.statusText}`);
    }
    
    const faceImageBuffer = await faceImageResponse.buffer();
    
    formData.append("face_image", faceImageBuffer, {
      filename: "face_image.jpg", 
      contentType: faceImageResponse.headers.get("content-type") || "image/jpeg"
    });

    const apiUrl = "http://93.127.132.230:8000/verify";
    
    console.log(`[ID_CHECK_FUNCTION] Calling external API at ${apiUrl} for verificationId: ${verificationId}`);
    
    const requestHeaders = {
      ...formData.getHeaders(),
      'api-key': apiKey,
      'User-Agent': 'Firebase-Function/1.0'
    };
    
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

      // Extract all relevant info from the API response
      const { 
        nombre_completo, 
        cedula, 
        fecha_nacimiento, 
        lugar_nacimiento, 
        nacionalidad, 
        sexo, 
        estado_civil, 
        ocupacion, 
        fecha_expiracion 
      } = responseData.document_info;

      const profileData = {
        name: nombre_completo,
        cedula: cedula,
        birthDate: fecha_nacimiento,
        birthPlace: lugar_nacimiento,
        nationality: nacionalidad,
        gender: sexo,
        civilStatus: estado_civil,
        occupation: ocupacion,
        idExpirationDate: fecha_expiracion,
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


exports.listAllUsers = regionalFunctions.https.onCall(async (data, context) => {
  // Check if the user is authenticated and is an admin
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const callerUid = context.auth.uid;
  const userDoc = await db.collection('users').doc(callerUid).get();

  if (!userDoc.exists || userDoc.data().role !== 'Admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can list users.');
  }

  // If the user is an admin, proceed to list all users
  try {
    const listUsersResult = await admin.auth().listUsers(1000); // 1000 is the max limit per page
    
    // For simplicity, we get users from Firestore collection to have all data like role, name, etc.
    const usersCollection = await db.collection('users').get();
    const users = usersCollection.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { users };
  } catch (error) {
    console.error('Error listing users:', error);
    throw new functions.https.HttpsError('internal', 'Unable to list users', error.message);
  }
});


exports.getFinancingSettings = regionalFunctions.https.onCall(async (data, context) => {
    const settingsRef = db.collection("config").doc("financing");
    try {
        const docSnap = await settingsRef.get();
        if (docSnap.exists) {
            return docSnap.data();
        } else {
            // Return a default if it doesn't exist
            return { interestRate: 0.525 };
        }
    } catch (error) {
        console.error("[SETTINGS_FUNCTION] Error getting settings:", error);
        throw new functions.https.HttpsError("internal", "Could not retrieve settings.");
    }
});

exports.saveFinancingSettings = regionalFunctions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "You must be logged in to save settings.");
    }

    // Optional: Add admin role check for extra security
    // const userDoc = await db.collection('users').doc(context.auth.uid).get();
    // if (!userDoc.exists || userDoc.data().role !== 'Admin') {
    //   throw new functions.https.HttpsError('permission-denied', 'Only admins can save settings.');
    // }
    
    const { interestRate } = data;
    if (typeof interestRate !== 'number' || interestRate < 0) {
        throw new functions.https.HttpsError("invalid-argument", "Invalid interest rate provided.");
    }

    const settingsRef = db.collection("config").doc("financing");
    try {
        await settingsRef.set({ interestRate }, { merge: true });
        return { success: true, message: "Settings saved successfully." };
    } catch (error) {
        console.error("[SETTINGS_FUNCTION] Error saving settings:", error);
        throw new functions.https.HttpsError("internal", "Could not save settings.");
    }
});

    
