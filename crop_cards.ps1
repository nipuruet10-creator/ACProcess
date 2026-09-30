Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\sazzad50463\.gemini\antigravity\brain\9cfc7a83-d8f6-4fb3-9985-d7db5f360d62\.user_uploaded\media_1790764320921.jpg"
$destDir = "E:\Antigravity\Keyword Research\AC_Process_Master_Suite\assets\img"

$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)
Write-Host "Source image dimensions: $($bmp.Width) x $($bmp.Height)"

function CropAndSave($x, $y, $w, $h, $name) {
    $rect = New-Object System.Drawing.Rectangle($x, $y, $w, $h)
    $cropped = $bmp.Clone($rect, $bmp.PixelFormat)
    $outPath = Join-Path $destDir $name
    $cropped.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)
    $cropped.Dispose()
    Write-Host "Saved: $name ($w x $h) at ($x, $y)"
}

# Row 1 cards: in 1024x576 image
# Card bounds Row 1: icon ends before y=292, card border starts after y=354
CropAndSave 27 292 233 62 "card_monthly_report.jpg"
CropAndSave 272 292 233 62 "card_dashboard_tms.jpg"
CropAndSave 517 292 233 62 "card_sop_making.jpg"
CropAndSave 762 292 233 62 "card_production_control.jpg"

# Row 2 cards:
# Card bounds Row 2: icon and title end before y=448, card border starts after y=498
CropAndSave 27 448 233 50 "card_kpi_analytics.jpg"
CropAndSave 272 448 233 50 "card_machine_process.jpg"
CropAndSave 517 448 233 50 "card_continuous_improvement.jpg"
CropAndSave 762 448 233 50 "card_engineering_library.jpg"

# Walton AC units
CropAndSave 800 70 220 156 "walton_ac_units.jpg"

$bmp.Dispose()
Write-Host "Finished cropping!"
