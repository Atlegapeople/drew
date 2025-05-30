/*
 * D.R.E.W. Vending Machine RFID Card Reader - Minimal Version
 * 
 * This sketch reads RFID cards using an MFRC522 RFID reader module
 * and sends the card UIDs over serial in a consistent format
 * for the Node.js backend.
 */

#include <SPI.h>
#include <MFRC522.h>

// RFID reader pins for ESP32
#define RST_PIN         2           // Reset pin (connected to GPIO2)
#define SS_PIN          5           // Slave select pin (connected to GPIO5)
#define LED_PIN         13          // LED indicator

// Create MFRC522 instance
MFRC522 rfid(SS_PIN, RST_PIN);

// Previous card UID for avoiding duplicates
MFRC522::Uid previousCard;
unsigned long lastCardReadTime = 0;
const unsigned long CARD_READ_COOLDOWN = 1000; // 1 second between reads

void setup() {
  // Initialize serial at 9600 baud to match Node.js service
  Serial.begin(9600);
  delay(500);
  
  // Clear any garbage in serial buffer
  while(Serial.available()) {
    Serial.read();
  }
  
  // Initialize LED indicator
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  
  // Initialize SPI bus
  SPI.begin();
  
  // Initialize RFID reader
  rfid.PCD_Init();
  
  // Configure for maximum sensitivity
  rfid.PCD_SetAntennaGain(MFRC522::RxGain_max);
  
  // Blink LED to show we're ready
  digitalWrite(LED_PIN, HIGH);
  delay(100);
  digitalWrite(LED_PIN, LOW);
  
  // Initialize previous card
  previousCard.size = 0;
}

void loop() {
  // Check if a new card is present
  if (!rfid.PICC_IsNewCardPresent()) {
    return;
  }
  
  // Read the card UID
  if (!rfid.PICC_ReadCardSerial()) {
    return;
  }
  
  // Turn on LED to show card detected
  digitalWrite(LED_PIN, HIGH);
  
  // Get current time
  unsigned long currentTime = millis();
  
  // Send card if it's new or if cooldown has passed
  if (isNewCard(rfid.uid) || (currentTime - lastCardReadTime > CARD_READ_COOLDOWN)) {
    // Send card UID to serial
    sendCardUID(rfid.uid);
    
    // Update the time
    lastCardReadTime = currentTime;
    
    // Save as previous card
    copyCardUID(rfid.uid, &previousCard);
  }
  
  // Halt the card
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  
  // Turn off LED
  delay(100);
  digitalWrite(LED_PIN, LOW);
}

// Send the card UID in a consistent format
void sendCardUID(MFRC522::Uid uid) {
    // Flush any data in the serial buffer before sending new data
  while (Serial.available() > 0) {
    Serial.read();
  }
  
  // Small delay to ensure clean transmission
  delay(10);
  
  // Format for Node.js: CARDUID:XXXXXXXX
  Serial.print("CARDUID:");
  
  // Send the UID as a hex string
  for (byte i = 0; i < uid.size; i++) {
    if (uid.uidByte[i] < 0x10) {
      Serial.print("0");
    }
    Serial.print(uid.uidByte[i], HEX);
  }
  
  // End with a newline and flush the buffer
  Serial.println();
  Serial.flush();
  
  // Blink LED to confirm
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(50);
    digitalWrite(LED_PIN, LOW);
    delay(50);
  }
}

// Check if the current card is different from the previous one
bool isNewCard(MFRC522::Uid uid) {
  // If we haven't seen a card yet, this is a new card
  if (previousCard.size == 0) {
    return true;
  }
  
  // Check if the size is different
  if (uid.size != previousCard.size) {
    return true;
  }
  
  // Compare each byte
  for (byte i = 0; i < uid.size; i++) {
    if (uid.uidByte[i] != previousCard.uidByte[i]) {
      return true;
    }
  }
  
  // It's the same card
  return false;
}

// Copy a card UID to another variable
void copyCardUID(MFRC522::Uid from, MFRC522::Uid *to) {
  to->size = from.size;
  for (byte i = 0; i < from.size && i < 10; i++) { // Add limit check to prevent overflow
    to->uidByte[i] = from.uidByte[i];
  }
  // Copy SAK and type if needed
  to->sak = from.sak;
}
