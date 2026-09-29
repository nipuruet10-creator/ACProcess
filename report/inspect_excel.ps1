Add-Type -AssemblyName System.IO.Compression.FileSystem

$zipPath = 'e:\Antigravity\Keyword Research\Process Task management entry 2025_2026.xlsx'
$zip = [System.IO.Compression.ZipFile]::OpenRead($zipPath)

# Read shared strings
$stringsEntry = $zip.Entries | Where-Object { $_.FullName -eq 'xl/sharedStrings.xml' }
$stream = $stringsEntry.Open()
$reader = New-Object System.IO.StreamReader($stream)
$ssXml = [xml]$reader.ReadToEnd()
$reader.Close()
$stream.Close()

$sharedStrings = @()
foreach ($si in $ssXml.sst.si) {
    if ($si.t) {
        $sharedStrings += $si.t.InnerText
    } elseif ($si.r) {
        $text = ($si.r | ForEach-Object { $_.t.InnerText }) -join ''
        $sharedStrings += $text
    } else {
        $sharedStrings += ''
    }
}

function Get-CellValue($c) {
    if (-not $c) { return '' }
    $val = $c.v
    if ($c.t -eq 's') {
        $idx = [int]$val
        if ($idx -lt $sharedStrings.Count) {
            return $sharedStrings[$idx]
        }
        return ''
    }
    return $val
}

Write-Host "Shared strings count: " $sharedStrings.Count

# Inspect Aug 26 (sheet2.xml)
$sheetEntry = $zip.Entries | Where-Object { $_.FullName -eq 'xl/worksheets/sheet2.xml' }
$stream = $sheetEntry.Open()
$reader = New-Object System.IO.StreamReader($stream)
$sheetXml = [xml]$reader.ReadToEnd()
$reader.Close()
$stream.Close()

Write-Host "=== AUG 26 ROWS (First 5 rows) ==="
$rows = $sheetXml.worksheet.sheetData.row
for ($i = 0; $i -lt [Math]::Min(10, $rows.Count); $i++) {
    $r = $rows[$i]
    $rowCells = @()
    foreach ($c in $r.c) {
        $val = Get-CellValue $c
        $rowCells += ($c.r + ": " + $val)
    }
    Write-Host ("Row " + $r.r + " -> " + ($rowCells -join " | "))
}

$zip.Dispose()
