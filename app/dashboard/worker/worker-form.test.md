# Fields

Field: Name
Type: String
Required: True
Visible: True
Editable: True
Validation: Has to be filled in order to submit the form
Default: Null

Field: NRIC
Type: String
Required: False
Visible: True
Editable: True

Field: Email
Type:Email
Required: False
Visible: True
Editable: True
Validation: Is an Email
Default: Null

Field: Phone
Type: String
Required: False
Visible: True
Editable: True
Validation: Optional free-text string (no format restriction)
Default: Null

Field: Country of Origin
Type: String
Required: False
Visible: True
Editable: True
Default: Null

Field: Race
Type: String
Required: False
Visible: True
Editable: True
Default: Null

---

Field: Employment Type
Type: String
Required: True
Visible: True
Editable: True
Validation: Must select either 'Full Time' or 'Part Time'
Default: Full Time

Field: Employment Arrangment
Type: String
Required: True
Visible: True
Editable: True
Validation: Must select either 'Foreign Worker' or 'Local Worker'
Default: Local Worker

---

Field: Monthly Pay
Type: Number
Required: Depending on state
Visible: Depending on state
Editable: True
Validation: Only can input numbers, allow 2 decimal points and no negative numbers
Default: Null

Field: Hourly Rate
Type: Number
Required: Depending on state
Visible: Depending on state
Editable: True
Validation: Only can input numbers, allow 2 decimal points and no negative numbers
Default: Null

Field: Rest Day Rate
Type: Number
Required: Depending on state
Visible: Depending on state
Editable: True
Validation: Only can input numbers, allow 2 decimal points and no negative numbers
Default: Null

Field: Minimum Working Hours
Type: Number
Required: Depending on state
Visible: Depending on state
Editable: True
Validation: Only can input numbers, whole numbers and no negative numbers
Default: Null

Field: CPF
Type: Number
Required: False
Visible: Depending on state
Editable: True
Validation: Only can input numbers, allow 2 decimal points and no negative numbers
Default: Null

---

Field: Payment Method
Type: String
Required: True
Visible: True
Editable: True
Validation: Must select either 'Cash', 'Bank Transfer' or 'PayNow'
Default: Cash

Field: Bank Account Number
Type: String
Required: Depending on state
Visible: Depending on state
Editable: True
Validation: Must not be empty
Default: Null

Field: PayNow
Type: String
Required: Depending on state
Visible: Depending on state
Editable: True
Validation: Must not be empty when payment method is PayNow
Default: Trimmed Phone value when switching to PayNow if PayNow is empty, otherwise null

---

# State laws

Employment Type: Full Time
Employment Arrangment: Local Worker
Test conditions: Monthly pay, hourly rate, rest day rate, minimum working hours has to be filled to submit and CPF is visible.

Employment Type: Full Time
Employment Arrangment: Foreign Worker
Test conditions: Monthly pay, hourly rate, rest day rate, minimum working hours has to be filled to submit

Employment Type: Full Time
Employment Arrangment: Local Worker
Test conditions: hourly rate has to be filled to submit and CPF is visible

Employment Type: Full Time
Employment Arrangment: Foreign Worker
Test conditions: hourly rate has to be filled to submit

Payment Method: Cash
Test conditions: Has to be cash by default

Payment Method: Bank Transfer
Test conditions: Bank Account number field has to appear and the user must fill it in order to submit.

Payment Method: PayNow
Test conditions: PayNow field has to appear; the trimmed Phone value is copied to PayNow when switching to PayNow if PayNow is empty, otherwise blank; the user must enter a non-empty PayNow string to submit.
