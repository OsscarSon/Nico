#include <Arduino.h>

constexpr unsigned long samplePeriodMs = 25;
unsigned long previousSample = 0;

void setup() {
  Serial.begin(9600);
}

void loop() {
  const unsigned long now = millis();
  if (now - previousSample < samplePeriodMs) return;
  previousSample = now;
  // Uno's A0 is read with its configured reference. Report ADC codes, not volts.
  const int sample = analogRead(A0);
  Serial.println(sample);
}
