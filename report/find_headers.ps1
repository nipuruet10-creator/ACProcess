Add-Type -AssemblyName System.IO.Compression.FileSystem

$zipPath = 'e:\Antigravity\Keyword Research\Process Task management entry 2025_2026.xlsx'
$zip = [System.IO.Compression.ZipFile]::OpenRead($zipPath)

$stringsEntry = $zip.Entries | Where-Object { $_.FullName -eq 'xl/sharedStrings.xml' }
$stream = $stringsEntry.Open()
$reader = New-Object System.IO.StreamReader($stream)
$ssXml = [xml]$reader.ReadToEnd()
$reader.Close()
$stream.Close()

$sharedStrings = New-Object System.Collections.Generic.List[string]
foreach ($si in $ssXml.sst.si) {
    if ($si.t) {
        $sharedStrings.Add($si.t.InnerText)
    } elseif ($si.r) {
        $text = ($si.r | ForEach-Object { $_.t.InnerText }) -join ''
        $sharedStrings.Add($text)
    } else {
        $sharedStrings.Add('')
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

$sheetEntry = $zip.Entries | Where-Object { $_.FullName -eq 'xl/worksheets/sheet2.xml' }
$stream = $sheetEntry.Open()
$reader = New-Object System.IO.StreamReader($stream)
$sheetXml = [xml]$reader.ReadToEnd()
$reader.Close()
$stream.Close()

$rows = $sheetXml.worksheet.sheetData.row
Write-Host "Total rows in Aug 26: " $rows.Count

# Find header row with "Task" or "Date"
for ($i = 0; $i -lt [Math]::Min(50, $rows.Count); $i++) {
    $r = $rows[$i]
    $rowText = ($r.c | ForEach-Object { Get-CellValue $_ }) -join ' | '
    if ($rowText -match 'Task' -or $rowText -match 'Date' -or $rowText -match 'Process') {
        Write-Host ("Potential header at row " + $r.r + ": " + $rowText)
    }
}

$zip.Dispose()
