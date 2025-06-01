/*
 * D.R.E.W. Vending Machine Control System
 * 
 * This sketch handles:
 * 1. RFID card reading using an MFRC522 RFID reader module
 * 2. Buzzer feedback for card scanning
 * 3. Motor control for product dispensing
 * 
 * The system communicates with a Node.js backend through serial,
 * receiving commands for motor control and sending card UIDs.
 */

#include <SPI.h>
#include <MFRC522.h>

// RFID reader pins for ESP32
#define RST_PIN         2           // Reset pin (connected to GPIO2)
#define SS_PIN          5           // Slave select pin (connected to GPIO5)
#define LED_PIN         13          // LED indicator
#define BUZZER_PIN      14          // Buzzer connected to GPIO14

// Motor control pins
#define MOTOR_ENABLE    15          // Motor enable pin (PWM)
#define MOTOR_IN1       26          // Motor direction control 1
#define MOTOR_IN2       27          // Motor direction control 2
#define MOTOR_SPEED     200         // Motor speed (0-255)
#define DISPENSE_TIME   1500        // Time to run motor for dispensing (ms)

// Create MFRC522 instance
MFRC522 rfid(SS_PIN, RST_PIN);

// Previous card UID for avoiding duplicates
MFRC522::Uid previousCard;
unsigned long lastCardReadTime = 0;
const unsigned long CARD_READ_COOLDOWN = 1000; // 1 second between reads

// Buzzer tones and durations
#define BEEP_FREQUENCY 2000       // 2kHz tone for standard beep
#define SUCCESS_FREQUENCY 2500    // Higher pitch for success tone
#define ERROR_FREQUENCY 1000      // Lower pitch for error tone
#define SHORT_BEEP 100           // Duration in ms for short beep
#define LONG_BEEP 300            // Duration in ms for long beep

// Command flags and buffers
String serialBuffer = "";
bool commandComplete = false;

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
  
  // Initialize buzzer
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  
  // Initialize motor control pins
  pinMode(MOTOR_ENABLE, OUTPUT);
  pinMode(MOTOR_IN1, OUTPUT);
  pinMode(MOTOR_IN2, OUTPUT);
  
  // Initialize motor to off state
  digitalWrite(MOTOR_IN1, LOW);
  digitalWrite(MOTOR_IN2, LOW);
  analogWrite(MOTOR_ENABLE, 0);
  
  // Initialize SPI bus
  SPI.begin();
  
  // Initialize RFID reader
  rfid.PCD_Init();
  
  // Configure for maximum sensitivity
  rfid.PCD_SetAntennaGain(MFRC522::RxGain_max);
  
  // Blink LED and beep once to show we're ready
  digitalWrite(LED_PIN, HIGH);
  beep(SUCCESS_FREQUENCY, SHORT_BEEP);
  digitalWrite(LED_PIN, LOW);
  
  // Initialize previous card
  previousCard.size = 0;
  
  // Output ready message
  Serial.println("SYSTEM:READY");
}

// Function to make the buzzer beep at a specific frequency and duration
void beep(int frequency, int duration) {
  tone(BUZZER_PIN, frequency, duration);
  delay(duration);
  noTone(BUZZER_PIN);
}

// Function for success beep pattern (two short high beeps)
void successBeep() {
  beep(SUCCESS_FREQUENCY, SHORT_BEEP);
  delay(50);
  beep(SUCCESS_FREQUENCY, SHORT_BEEP);
}

// Function for error beep pattern (one long low beep)
void errorBeep() {
  beep(ERROR_FREQUENCY, LONG_BEEP);
}

// Flag to track if dispense is in progress to prevent multiple responses
bool dispensingInProgress = false;

// Function to dispense a product
void dispenseProduct(String productType) {
  // Prevent multiple dispensing operations from running at the same time
  if (dispensingInProgress) {
    Serial.print("BUSY:ALREADY_DISPENSING:");
    Serial.println(productType);
    return;
  }
  
  // Set the flag to prevent multiple operations
  dispensingInProgress = true;
  
  // Determine motor direction based on product type
  bool clockwise = (productType == "tampon");
  
  // Log the dispensing action - just once
  Serial.print("DISPENSING:");
  Serial.println(productType);
  
  // Set motor direction
  if (clockwise) {
    digitalWrite(MOTOR_IN1, HIGH);
    digitalWrite(MOTOR_IN2, LOW);
  } else {
    digitalWrite(MOTOR_IN1, LOW);
    digitalWrite(MOTOR_IN2, HIGH);
  }
  
  // Start motor
  analogWrite(MOTOR_ENABLE, MOTOR_SPEED);
  
  // Single beep at start
  beep(SUCCESS_FREQUENCY, SHORT_BEEP);
  
  // Keep motor running for the dispensing time
  delay(DISPENSE_TIME);
  
  // Stop motor
  analogWrite(MOTOR_ENABLE, 0);
  digitalWrite(MOTOR_IN1, LOW);
  digitalWrite(MOTOR_IN2, LOW);
  
  // Send completion message
  Serial.print("COMPLETE:");
  Serial.println(productType);
  
  // Reset the flag
  dispensingInProgress = false;
}

void loop() {
  // Check for incoming serial commands
  checkSerialCommands();
  
  // Check for RFID cards
  checkRFIDCards();
}

// Function to check and process incoming serial commands
void checkSerialCommands() {
  while (Serial.available() > 0 && !commandComplete) {
    char inChar = (char)Serial.read();
    
    // Process command when newline is received
    if (inChar == '\n') {
      commandComplete = true;
    } else {
      // Add character to buffer
      serialBuffer += inChar;
    }
  }
  
  // Process completed command
  if (commandComplete) {
    // Check for motor commands
    if (serialBuffer.startsWith("DISPENSE:")) {
      String productType = serialBuffer.substring(9);
      dispenseProduct(productType);
    }
    
    // Reset for next command
    serialBuffer = "";
    commandComplete = false;
  }
}

// Function to check for RFID cards
void checkRFIDCards() {
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
  
  // Beep to provide immediate feedback that a card was detected
  beep(BEEP_FREQUENCY, SHORT_BEEP);
  
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
    
    // Play success beep pattern for a successful card read
    successBeep();
  }
  else {
    // Already read this card recently, play an error beep
    errorBeep();
  }
  
  // Halt the card
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
  
  // Turn off LED
  delay(50); // Shortened delay
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
  
  // Confirmation pattern - combined LED and buzzer feedback
  for (int i = 0; i < 2; i++) {
    digitalWrite(LED_PIN, HIGH);
    tone(BUZZER_PIN, BEEP_FREQUENCY + (i * 300), 40); // Ascending tones
    delay(50);
    digitalWrite(LED_PIN, LOW);
    noTone(BUZZER_PIN);
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
