# Checks each source file for non-ASCII bytes and reports.
$targets = @(
  "src\pages\business\Staff.jsx",
  "src\pages\business\Services.jsx",
  "src\pages\business\Locations.jsx",
  "src\pages\business\Dashboard.jsx",
  "src\pages\business\Billing.jsx",
  "src\pages\business\Settings.jsx",
  "src\pages\business\Calendar.jsx",
  "src\components\business\BusinessTopBar.jsx",
  "src\components\business\KpiCard.jsx",
  "src\i18n\strings.js"
)

foreach ($t in $targets) {
  $file = Join-Path $PWD $t
  if (-not (Test-Path $file)) { continue }
  $bytes = [System.IO.File]::ReadAllBytes($file)
  $bad = @($bytes | Where-Object { $_ -gt 127 }).Count
  $color = if ($bad -gt 0) { "Yellow" } else { "Green" }
  Write-Host ("{0} : {1} non-ASCII bytes" -f $t, $bad) -ForegroundColor $color
}