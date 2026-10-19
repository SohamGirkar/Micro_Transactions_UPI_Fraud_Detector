// Scenarios only define INPUT FEATURES. Probabilities, risk levels and SHAP values always come from POST /api/predict.
export interface TxnInput {
  amount: number; transactions_last_hour: number; account_age_days: number
  new_device: number; location_changed: number; failed_attempts: number; time_since_last_transaction: number
}
export interface Stage { short: string; label: string; description: string; event?: string; input: TxnInput }
export interface Scenario { id: string; name: string; blurb: string; stages: Stage[] }

const t = (amount: number, tx: number, age: number, nd: number, loc: number, fail: number, gap: number): TxnInput =>
  ({ amount, transactions_last_hour: tx, account_age_days: age, new_device: nd, location_changed: loc, failed_attempts: fail, time_since_last_transaction: gap })

export const SCENARIOS: Scenario[] = [
  { id: 'micro', name: 'Micro-Transaction Attack',
    blurb: 'A compromised account starts draining tiny amounts at increasing speed from a new device and location.',
    stages: [
      { short: 'NORMAL', label: 'NORMAL ACTIVITY', description: 'User behavior appears consistent with the established baseline.', input: t(250, 1, 900, 0, 0, 0, 3600) },
      { short: 'INCREASED ACTIVITY', label: 'INCREASED ACTIVITY', description: 'Slightly more frequent, smaller payments than usual.', input: t(180, 2, 900, 0, 0, 0, 1200) },
      { short: 'NEW DEVICE', label: 'NEW DEVICE DETECTED', event: 'NEW DEVICE', description: 'The transaction originates from a device not previously associated with this behavioral pattern.', input: t(25, 3, 900, 1, 0, 1, 300) },
      { short: 'LOCATION CHANGE', label: 'LOCATION CHANGE DETECTED', event: 'LOCATION CHANGE', description: 'The transaction location differs from the account’s usual location.', input: t(15, 4, 900, 1, 1, 1, 120) },
      { short: 'VELOCITY SPIKE', label: 'TRANSACTION VELOCITY INCREASING', event: 'VELOCITY SPIKE', description: 'Transactions are arriving faster, with repeated failed attempts.', input: t(10, 6, 900, 1, 1, 2, 60) },
      { short: 'MICRO-TRANSACTION PATTERN', label: 'MICRO-TRANSACTION PATTERN', event: 'MICRO-TRANSACTION PATTERN', description: 'Many very small payments in quick succession.', input: t(8, 9, 900, 1, 1, 3, 20) },
      { short: 'CRITICAL ACTIVITY', label: 'CRITICAL SUSPICIOUS ACTIVITY', description: 'Extreme velocity and repeated failures on an unfamiliar device and location.', input: t(7, 12, 900, 1, 1, 5, 10) },
    ] },
  { id: 'takeover', name: 'Account Takeover',
    blurb: 'An attacker guesses credentials, logs in from a new device and location, then moves money out.',
    stages: [
      { short: 'NORMAL', label: 'NORMAL ACTIVITY', description: 'Regular payment from the usual device and place.', input: t(400, 1, 900, 0, 0, 0, 7200) },
      { short: 'FAILED LOGINS', label: 'REPEATED FAILED ATTEMPTS', event: 'FAILED ATTEMPTS', description: 'Several failed attempts precede the next transaction.', input: t(400, 1, 900, 0, 0, 3, 7000) },
      { short: 'NEW DEVICE', label: 'NEW DEVICE LOGIN', event: 'NEW DEVICE', description: 'Access now comes from an unrecognized device.', input: t(400, 1, 900, 1, 0, 3, 6900) },
      { short: 'LOCATION CHANGE', label: 'LOCATION CHANGE DETECTED', event: 'LOCATION CHANGE', description: 'The session location no longer matches the account history.', input: t(400, 1, 900, 1, 1, 3, 6800) },
      { short: 'LARGE TRANSFER', label: 'LARGE TRANSFER ATTEMPT', event: 'LARGE TRANSFER', description: 'A much larger payment is attempted soon after.', input: t(5000, 2, 900, 1, 1, 3, 300) },
      { short: 'RAPID DRAIN', label: 'RAPID FOLLOW-UP TRANSFERS', event: 'VELOCITY SPIKE', description: 'More transfers follow within minutes.', input: t(3000, 4, 900, 1, 1, 4, 60) },
    ] },
  { id: 'velocity', name: 'Velocity Attack',
    blurb: 'Same device and location, but transaction frequency climbs sharply while gaps shrink.',
    stages: [
      { short: 'NORMAL', label: 'NORMAL ACTIVITY', description: 'One payment in the last hour.', input: t(120, 1, 700, 0, 0, 0, 3000) },
      { short: '3 / HOUR', label: 'ELEVATED FREQUENCY', description: 'Three payments within the hour.', input: t(60, 3, 700, 0, 0, 0, 900) },
      { short: '6 / HOUR', label: 'VELOCITY INCREASING', event: 'VELOCITY SPIKE', description: 'Six payments within the hour.', input: t(40, 6, 700, 0, 0, 0, 300) },
      { short: '10 / HOUR', label: 'HIGH VELOCITY', description: 'Ten payments, minutes apart.', input: t(30, 10, 700, 0, 0, 0, 90) },
      { short: '15 / HOUR', label: 'EXTREME VELOCITY', description: 'Fifteen payments, seconds apart.', input: t(20, 15, 700, 0, 0, 0, 30) },
      { short: '20 / HOUR', label: 'SUSTAINED BURST', description: 'Twenty payments with almost no gap.', input: t(15, 20, 700, 0, 0, 0, 10) },
    ] },
  { id: 'devloc', name: 'New Device + Location',
    blurb: 'A familiar account suddenly appears on a new device, then in a new location, with otherwise normal spending.',
    stages: [
      { short: 'NORMAL', label: 'NORMAL ACTIVITY', description: 'Known device and location.', input: t(300, 2, 1200, 0, 0, 0, 2400) },
      { short: 'NEW DEVICE', label: 'NEW DEVICE DETECTED', event: 'NEW DEVICE', description: 'Only the device changes.', input: t(300, 2, 1200, 1, 0, 0, 2400) },
      { short: 'LOCATION CHANGE', label: 'NEW DEVICE + LOCATION CHANGE', event: 'LOCATION CHANGE', description: 'Both device and location now differ.', input: t(300, 2, 1200, 1, 1, 0, 2400) },
      { short: 'WITH FAILURES', label: 'ADDED FAILED ATTEMPTS', description: 'A failed attempt appears on top of the new context.', input: t(300, 2, 1200, 1, 1, 2, 2400) },
      { short: 'BACK TO NORMAL', label: 'KNOWN DEVICE, SAME LOCATION', description: 'Control step: the user returns to their usual device and place.', input: t(300, 2, 1200, 0, 0, 0, 2400) },
    ] },
  { id: 'dormant', name: 'Dormant Account Activity',
    blurb: 'An old account with a very long gap since its last transaction suddenly becomes active.',
    stages: [
      { short: 'DORMANT', label: 'DORMANT ACCOUNT', description: 'Old account, about a month since the last transaction.', input: t(150, 0, 1400, 0, 0, 0, 2592000) },
      { short: 'WAKES UP', label: 'ACTIVITY AFTER LONG GAP', description: 'First payment in a long time, from a new device.', input: t(150, 1, 1400, 1, 0, 0, 2592000) },
      { short: 'LOCATION CHANGE', label: 'LOCATION CHANGE DETECTED', event: 'LOCATION CHANGE', description: 'The session also moves to a new location.', input: t(80, 2, 1400, 1, 1, 1, 600) },
      { short: 'BURST', label: 'SUDDEN BURST', event: 'VELOCITY SPIKE', description: 'Rapid payments from a previously silent account.', input: t(40, 6, 1400, 1, 1, 2, 45) },
      { short: 'MICRO-TRANSACTION PATTERN', label: 'MICRO-TRANSACTION PATTERN', event: 'MICRO-TRANSACTION PATTERN', description: 'Tiny repeated payments in seconds.', input: t(10, 10, 1400, 1, 1, 3, 15) },
    ] },
]
