Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead("D:\0_ART\code\MV\logic\backend\deploy\Logic_Fruit_L-Nex_Press_Release_Oct_6_2026.docx")
$entry = $zip.Entries | Where-Object { $_.FullName -eq "word/document.xml" }
$stream = $entry.Open()
$reader = New-Object System.IO.StreamReader($stream)
$xmlText = $reader.ReadToEnd()
$reader.Close()
$stream.Close()

# Also let's check if there are images in the docx!
$images = $zip.Entries | Where-Object { $_.FullName -like "word/media/*" }
foreach ($img in $images) {
    Write-Output "IMAGE: $($img.FullName) ($($img.Length) bytes)"
    $outPath = Join-Path "D:\0_ART\code\MV\logic\backend\deploy" ([System.IO.Path]::GetFileName($img.FullName))
    [System.IO.Compression.ZipFileExtensions]::ExtractToFile($img, $outPath, $true)
}
$zip.Dispose()

[xml]$xml = $xmlText
$ns = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
$ns.AddNamespace("w", "http://schemas.openxmlformats.org/wordprocessingml/2006/main")

$sb = New-Object System.Text.StringBuilder
$paragraphs = $xml.SelectNodes("//w:p", $ns)
foreach ($p in $paragraphs) {
    $textNodes = $p.SelectNodes(".//w:t", $ns)
    $line = ""
    foreach ($t in $textNodes) {
        $line += $t.InnerText
    }
    if ($line.Trim().Length -gt 0) {
        [void]$sb.AppendLine($line)
    }
}

[System.IO.File]::WriteAllText("D:\0_ART\code\MV\logic\backend\deploy\extracted_press_release.txt", $sb.ToString(), [System.Text.Encoding]::UTF8)
Write-Output "Successfully extracted to extracted_press_release.txt"
