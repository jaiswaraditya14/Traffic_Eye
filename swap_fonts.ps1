# Bulk swap font families in all JS files
$files = Get-ChildItem -Path 'D:\Traffic_Eye\src' -Recurse -Filter '*.js'
$files += Get-ChildItem -Path 'D:\Traffic_Eye\App.js'

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    if ($content -match 'DMSans-') {
        $content = $content -replace 'DMSans-Regular', 'Nunito-Regular'
        $content = $content -replace 'DMSans-RegularItalic', 'Nunito-RegularItalic'
        $content = $content -replace 'DMSans-Medium', 'Nunito-Medium'
        $content = $content -replace 'DMSans-SemiBold', 'Nunito-SemiBold'
        $content = $content -replace 'DMSans-Bold', 'Nunito-Bold'
        $content = $content -replace 'DMSans-BoldItalic', 'Nunito-RegularItalic'
        
        Set-Content $file.FullName $content -NoNewline
        Write-Host "Updated font in: $($file.Name)"
    }
}

# Also update theme.js FONT_FAMILIES object values
$themeFile = 'D:\Traffic_Eye\src\utils\theme.js'
if (Test-Path $themeFile) {
    $content = Get-Content $themeFile -Raw
    $content = $content -replace 'DMSans-Regular', 'Nunito-Regular'
    $content = $content -replace 'DMSans-RegularItalic', 'Nunito-RegularItalic'
    $content = $content -replace 'DMSans-Medium', 'Nunito-Medium'
    $content = $content -replace 'DMSans-SemiBold', 'Nunito-SemiBold'
    $content = $content -replace 'DMSans-Bold', 'Nunito-Bold'
    $content = $content -replace 'DMSans-BoldItalic', 'Nunito-RegularItalic'
    Set-Content $themeFile $content -NoNewline
    Write-Host "Updated theme.js constants"
}
