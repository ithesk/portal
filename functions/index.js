
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
        expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        attempts: 0
    });

    // 4. Call the external SMS API
    const apiKey = functions.config().ithesk.apikey;
    
    console.log("[SMS] API Key exists:", apiKey ? "YES" : "NO");
    console.log("[SMS] Config keys:", Object.keys(functions.config()));
    console.log("[SMS] ithesk config:", functions.config().ithesk ? Object.keys(functions.config().ithesk) : "NO ithesk config");
    console.log("[SMS] API Key (full for debug):", JSON.stringify(apiKey)); // Temporal para debug
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
// SCHEDULED FUNCTION FOR PAYMENT REMINDERS
// =======================================================================================
exports.sendPaymentReminders = regionalFunctions.pubsub.schedule('every 24 hours').onRun(async (context) => {
    console.log('[REMINDER_LOG] Running daily payment reminder check...');

    const now = new Date();
    const reminderDate = new Date();
    reminderDate.setDate(now.getDate() + 2); // Remind 2 days in advance

    try {
        // 1. Get all active requests
        const requestsQuery = db.collection('requests').where('status', '==', 'Aprobado');
        const requestsSnapshot = await requestsQuery.get();
        
        if (requestsSnapshot.empty) {
            console.log('[REMINDER_LOG] No active requests found. Exiting.');
            return null;
        }

        const reminderPromises = requestsSnapshot.docs.map(async (doc) => {
            const request = doc.data();
            const requestId = doc.id;
            
            // 2. For each request, find out how many payments were made
            const paymentsQuery = db.collection('payments').where('requestId', '==', requestId);
            const paymentsSnapshot = await paymentsQuery.get();
            const paymentsMadeCount = paymentsSnapshot.size;

            if (paymentsMadeCount >= request.installments) {
                return; // Financing is fully paid
            }

            // 3. Calculate next payment due date
            const nextInstallmentNumber = paymentsMadeCount + 1;
            const startDate = request.createdAt.toDate();
            const dueDate = new Date(startDate.getTime());
            // Installments are bi-weekly (every 15 days)
            dueDate.setDate(dueDate.getDate() + nextInstallmentNumber * 15);
            
            // 4. Check if the due date is in 2 days and if reminder was already sent
            const isDueForReminder = dueDate.getFullYear() === reminderDate.getFullYear() &&
                                     dueDate.getMonth() === reminderDate.getMonth() &&
                                     dueDate.getDate() === reminderDate.getDate();

            if (isDueForReminder && request.lastReminderSentForInstallment !== nextInstallmentNumber) {
                console.log(`[REMINDER_LOG] Request [${requestId}] is due for reminder for installment #${nextInstallmentNumber}.`);
                
                // 5. Get user's phone and send SMS
                const userDoc = await db.collection('users').doc(request.userId).get();
                if (!userDoc.exists || !userDoc.data().phone) {
                    console.error(`[REMINDER_LOG] ERROR: User [${request.userId}] for request [${requestId}] not found or has no phone.`);
                    return;
                }
                
                const userData = userDoc.data();
                const phoneNumber = userData.phone;
                const clientName = userData.name.split(' ')[0]; // Just the first name
                const amount = request.biweeklyPayment.toFixed(2);
                
                const message = `Hola ${clientName}, te recordamos que tu cuota de Alza de RD$${amount} vence en 2 dias. Gracias por tu pago puntual.`;
                
                // Send the SMS via iThesk API
                const apiKey = functions.config().ithesk.apikey;
                if (!apiKey) {
                    console.error("[REMINDER_LOG] CRITICAL: iThesk API Key is not configured.");
                    return;
                }
                
                await fetch("http://sms.ithesk.com/send-sms/", {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
                    body: JSON.stringify({ number: phoneNumber, message: message }),
                });

                console.log(`[REMINDER_LOG] Reminder SMS sent to ${phoneNumber} for request [${requestId}].`);

                // 6. Update the request to prevent re-sending
                return db.collection('requests').doc(requestId).update({
                    lastReminderSentForInstallment: nextInstallmentNumber
                });
            }
        });

        await Promise.all(reminderPromises);
        console.log('[REMINDER_LOG] Finished payment reminder check.');
        return null;

    } catch (error) {
        console.error('[REMINDER_LOG] CRITICAL: An error occurred during the reminder process:', error);
        return null;
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
  // 1. Security Check: Ensure caller is an Admin
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }
  const callerDoc = await db.collection('users').doc(context.auth.uid).get();
  if (!callerDoc.exists || callerDoc.data().role !== 'Admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can list users.');
  }

  // 2. Fetch all users from Firestore
  try {
    const usersCollection = await db.collection('users').get();
    // Map Firestore docs to an array, importantly using the document ID as the main `id` field
    const users = usersCollection.docs.map(doc => ({
      id: doc.id, // Using Firestore document ID
      ...doc.data(),
    }));

    return { users };
  } catch (error) {
    console.error('Error listing users from Firestore:', error);
    throw new functions.https.HttpsError('internal', 'Unable to list users from Firestore.', error.message);
  }
});


// =======================================================================================
// ADMIN USER MANAGEMENT FUNCTION
// =======================================================================================

exports.createNewUserByAdmin = regionalFunctions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Debes estar autenticado.');
    }
    const callerDoc = await db.collection('users').doc(context.auth.uid).get();
    if (!callerDoc.exists || callerDoc.data().role !== 'Admin') {
        throw new functions.https.HttpsError('permission-denied', 'Solo los administradores pueden crear usuarios.');
    }

    const { email, name, phone, cedula, address } = data;
    if (!email || !name || !cedula) {
        throw new functions.https.HttpsError('invalid-argument', 'Se requieren nombre, correo y cédula.');
    }

    try {
        // 1. Create user in Firebase Auth
        const userRecord = await admin.auth().createUser({
            email: email,
            emailVerified: false,
            password: '123456', // Default temporary password
            displayName: name,
            disabled: false,
        });
        
        // 2. Create user document in Firestore using the Auth UID
        const userDocRef = db.collection('users').doc(userRecord.uid);
        await userDocRef.set({
            name: name,
            email: email,
            phone: phone || '',
            address: address || '',
            cedula: cedula,
            role: 'Cliente',
            status: 'Activo',
            since: new Date().toLocaleDateString("es-DO"),
            createdAt: FieldValue.serverTimestamp(),
        });
        
        return { success: true, uid: userRecord.uid, message: 'Usuario creado exitosamente.' };

    } catch (error) {
        console.error('Error creando nuevo usuario por admin:', error);
        if (error.code === 'auth/email-already-exists') {
            throw new functions.https.HttpsError('already-exists', 'Ya existe un usuario con este correo electrónico.');
        }
        throw new functions.https.HttpsError('internal', 'No se pudo crear el usuario.', error.message);
    }
});

exports.updateUserByAdmin = regionalFunctions.https.onCall(async (data, context) => {
  // **DIAGNÓSTICO**: Log the data received by the function.
  console.log(`[ADMIN_UPDATE_LOG] Function received call with data:`, JSON.stringify(data));
  console.log(`[ADMIN_UPDATE_LOG] Caller auth context:`, JSON.stringify(context.auth));

  // 1. Security Check: Ensure caller is an Admin
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }
  const callerDoc = await db.collection('users').doc(context.auth.uid).get();
  if (!callerDoc.exists || callerDoc.data().role !== 'Admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can perform this action.');
  }

  const { userId, name, email, phone, role, password } = data;

  if (!userId) {
    throw new functions.https.HttpsError('invalid-argument', 'The "userId" is required.');
  }
  console.log(`[ADMIN_UPDATE] Received request to update user with Auth UID: ${userId}`);

  try {
    // 2. Prepare updates for Auth and Firestore
    const authUpdates = {};
    const firestoreUpdates = {};

    // Only add fields to update objects if they were provided
    if (email) authUpdates.email = email;
    if (password) {
        if (password.length < 6) {
            throw new functions.https.HttpsError('invalid-argument', 'La contraseña debe tener al menos 6 caracteres.');
        }
        authUpdates.password = password;
    }
    if (name) authUpdates.displayName = name;

    if (name) firestoreUpdates.name = name;
    if (email) firestoreUpdates.email = email;
    if (phone) firestoreUpdates.phone = phone;
    if (role) firestoreUpdates.role = role;
    
    // 3. Perform updates
    console.log(`[ADMIN_UPDATE] Attempting to update user with UID: ${userId}`);

    // Update Firebase Auth user only if there are changes for Auth
    if (Object.keys(authUpdates).length > 0) {
      await admin.auth().updateUser(userId, authUpdates);
      console.log(`[ADMIN_UPDATE] Firebase Auth record for ${userId} updated.`);
    }
    
    // Update Firestore user document only if there are changes for Firestore
    if (Object.keys(firestoreUpdates).length > 0) {
      const userDocRef = db.collection('users').doc(userId);
      await userDocRef.update(firestoreUpdates);
      console.log(`[ADMIN_UPDATE] Firestore document for ${userId} updated.`);
    }

    console.log(`Admin ${context.auth.uid} successfully updated user ${userId}.`);
    return { success: true, message: 'Usuario actualizado correctamente.' };

  } catch (error) {
    console.error(`Error updating user ${userId} by admin ${context.auth.uid}:`, error);
    if (error.code && error.code.startsWith('auth/')) {
        if (error.code === 'auth/user-not-found') {
            throw new functions.https.HttpsError('not-found', `No se encontró un usuario de autenticación con el ID: ${userId}.`);
        }
        throw new functions.https.HttpsError('invalid-argument', error.message);
    }
    throw new functions.https.HttpsError('internal', 'No se pudo actualizar el usuario.', error.message);
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

// =======================================================================================
// SYSTEM TOOLS / BACKFILL FUNCTIONS
// =======================================================================================
exports.backfillRequestUserIds = regionalFunctions.https.onCall(async (data, context) => {
    // Security Check: Only allow admins to run this
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Debes estar autenticado para realizar esta acción.');
    }
    const callerDoc = await db.collection('users').doc(context.auth.uid).get();
    if (!callerDoc.exists || callerDoc.data().role !== 'Admin') {
        throw new functions.https.HttpsError('permission-denied', 'Solo los administradores pueden ejecutar esta herramienta.');
    }

    console.log("BACKFILL_FUNCTION: Starting backfill process...");
    const batch = db.batch();
    let requestsChecked = 0;
    let requestsUpdated = 0;

    try {
        // 1. Get all users and map their cedula to their UID (which is the doc ID)
        console.log("BACKFILL_FUNCTION: Fetching users from 'users' collection...");
        const usersRef = db.collection("users");
        const usersSnapshot = await usersRef.get();
        const cedulaToUserIdMap = new Map();
        usersSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.cedula) {
                cedulaToUserIdMap.set(data.cedula, doc.id);
            }
        });
        console.log(`BACKFILL_FUNCTION: Found ${cedulaToUserIdMap.size} users with cedulas.`);

        // 2. Get all requests that are missing a userId
        console.log("BACKFILL_FUNCTION: Fetching requests missing a 'userId'...");
        const requestsRef = db.collection("requests");
        // Firestore doesn't have a direct "is not null" or "field does not exist" query
        // so we fetch all and filter locally. For very large collections, this would be inefficient.
        const requestsSnapshot = await requestsRef.get();
        requestsChecked = requestsSnapshot.size;

        requestsSnapshot.forEach(doc => {
            const request = doc.data();
            // Find requests where userId is missing, null, or an empty string, but cedula is present
            if ((!request.userId || request.userId === "") && request.cedula) {
                const userId = cedulaToUserIdMap.get(request.cedula);
                if (userId) {
                    console.log(`BACKFILL_FUNCTION: Match found! Request [${doc.id}] will be updated with userId [${userId}].`);
                    const requestToUpdateRef = requestsRef.doc(doc.id);
                    batch.update(requestToUpdateRef, { userId: userId });
                    requestsUpdated++;
                }
            }
        });

        if (requestsUpdated > 0) {
            console.log(`BACKFILL_FUNCTION: Committing batch to update ${requestsUpdated} requests.`);
            await batch.commit();
        }

        const message = `Backfill completo. Se revisaron ${requestsChecked} solicitudes, se actualizaron ${requestsUpdated}.`;
        console.log(`BACKFILL_FUNCTION: ${message}`);
        return { success: true, message, requestsChecked, requestsUpdated };

    } catch (error) {
        console.error("BACKFILL_FUNCTION: CRITICAL - An error occurred during the backfill process:", error);
        return {
            success: false,
            message: `Error durante la corrección: ${error.message}`,
        };
    }
});
    

    

    

    

    

    