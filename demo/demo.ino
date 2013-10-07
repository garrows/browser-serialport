/*
  Serial Event example
 
 When new serial data arrives, this sketch adds it to a String.
 When a newline is received, the loop prints the string and 
 clears it.
 
 Also prompts the user for input.
 
 This code modified from Tom Igoe's here:
 
 http://www.arduino.cc/en/Tutorial/SerialEvent
 
 */

String inputString = "";         // a string to hold incoming data
boolean stringComplete = false;  // whether the string is complete

void setup() {
  // initialize serial:
  Serial.begin(9600);
  // reserve 200 bytes for the inputString:
  inputString.reserve(200);
  establishContact();
}

void loop() {
  // print the string when a newline arrives:
  if (stringComplete) {
    Serial.print("Got line:");
    Serial.println(inputString); 
    // clear the string:
    inputString = "";
    stringComplete = false;
    establishContact();
  }
}

/*
  SerialEvent occurs whenever a new data comes in the
 hardware serial RX.  This routine is run between each
 time loop() runs, so using delay inside loop can delay
 response.  Multiple bytes of data may be available.
 */
void serialEvent() {
  while (Serial.available()) {
    // get the new byte:
    char inChar = (char)Serial.read(); 
    // add it to the inputString:
    inputString += inChar;
    // if the incoming character is a newline, set a flag
    // so the main loop can do something about it:
    if (inChar == '\n') {
      stringComplete = true;
    } 
  }
}

void establishContact() {
  Serial.print("Waiting");
  while (Serial.available() <= 0) {
    Serial.print(".");   // send a capital A
    delay(500);
  }
}


