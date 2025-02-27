import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { db } from "./config";
export const signUp = functions.https.onRequest(async (req, res) => {
  const { email, password, name, userType } = req.body;
  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });
    await db.ref(`users/${userRecord.uid}`).set({
      name,
      userType,
      createdAt: admin.database.ServerValue.TIMESTAMP,
    });
    res.status(201).json({ uid: userRecord.uid });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});