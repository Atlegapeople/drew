import db, { hashPin, verifyPin } from '../db';
import crypto from 'crypto';

export interface AuthResult {
  success: boolean;
  profileId?: number;
  cardUid?: string;
  accessLevel?: string;
  message?: string;
}

export default class AuthService {
  // Authenticate with RFID card
  static authenticateWithRFID(cardUid: string): AuthResult {
    try {
      // Find profile by card UID
      const profile = db.prepare('SELECT * FROM access_profiles WHERE card_uid = ?').get(cardUid);
      
      if (!profile) {
        // Log failed attempt
        db.prepare(
          'INSERT INTO access_logs (card_uid, method, result) VALUES (?, ?, ?)'
        ).run(cardUid, 'rfid', 'denied');
        
        return { 
          success: false, 
          message: 'Card not recognized' 
        };
      }
      
      // Update last access time
      db.prepare('UPDATE access_profiles SET last_access = CURRENT_TIMESTAMP WHERE id = ?').run(profile.id);
      
      // Log successful access
      db.prepare(
        'INSERT INTO access_logs (profile_id, card_uid, method, result) VALUES (?, ?, ?, ?)'
      ).run(profile.id, cardUid, 'rfid', 'granted');
      
      return {
        success: true,
        profileId: profile.id,
        cardUid: profile.card_uid,
        accessLevel: profile.access_level
      };
    } catch (error) {
      console.error('RFID authentication error:', error);
      return { 
        success: false, 
        message: 'Authentication error' 
      };
    }
  }
  
  // Authenticate with PIN
  static authenticateWithPIN(pin: string): AuthResult {
    try {
      // Find all profiles (PIN is not unique, so we need to check all)
      const profiles = db.prepare('SELECT * FROM access_profiles WHERE pin_hash IS NOT NULL').all();
      
      // Check if PIN matches any profile
      for (const profile of profiles) {
        if (verifyPin(pin, profile.pin_hash, profile.pin_salt)) {
          // Update last access time
          db.prepare('UPDATE access_profiles SET last_access = CURRENT_TIMESTAMP WHERE id = ?').run(profile.id);
          
          // Log successful access
          db.prepare(
            'INSERT INTO access_logs (profile_id, card_uid, method, result) VALUES (?, ?, ?, ?)'
          ).run(profile.id, profile.card_uid, 'pin', 'granted');
          
          return {
            success: true,
            profileId: profile.id,
            cardUid: profile.card_uid,
            accessLevel: profile.access_level
          };
        }
      }
      
      // If we get here, no match was found
      db.prepare(
        'INSERT INTO access_logs (method, result) VALUES (?, ?)'
      ).run('pin', 'denied');
      
      return { 
        success: false, 
        message: 'Invalid PIN' 
      };
    } catch (error) {
      console.error('PIN authentication error:', error);
      return { 
        success: false, 
        message: 'Authentication error' 
      };
    }
  }
  
  // Get failed PIN attempts in the last 5 minutes
  static getRecentFailedPINAttempts(): number {
    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const result = db.prepare(`
        SELECT COUNT(*) as count 
        FROM access_logs 
        WHERE method = 'pin' 
        AND result = 'denied' 
        AND timestamp > ?
      `).get(fiveMinutesAgo);
      
      return result.count;
    } catch (error) {
      console.error('Error getting failed attempts:', error);
      return 0;
    }
  }
  
  // Create a new user
  static createUser(cardUid: string, pin?: string, accessLevel: string = 'user'): boolean {
    try {
      let pinHash = null;
      let pinSalt = null;
      
      if (pin) {
        pinSalt = crypto.randomBytes(16).toString('hex');
        pinHash = hashPin(pin, pinSalt);
      }
      
      db.prepare(`
        INSERT INTO access_profiles (card_uid, pin_hash, pin_salt, access_level)
        VALUES (?, ?, ?, ?)
      `).run(cardUid, pinHash, pinSalt, accessLevel);
      
      return true;
    } catch (error) {
      console.error('Error creating user:', error);
      return false;
    }
  }
}
