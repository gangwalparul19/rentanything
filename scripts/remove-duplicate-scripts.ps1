# Remove duplicate inline script tags from HTML files
# These scripts are already called in the respective JS modules

$htmlFiles = @(
   "profile.html",
    "chat.html",
    "create-listing.html",
    "my-bookings.html",
    "my-listings.html",
    "help-center.html",
    "how-it-works.html",
    "about.html",
    "community-guidelines.html",
    "requests.html",
    "wishlist.html",
    "user-profile.html",
    "properties.html",
    "my-properties.html",
    "list-property.html",
    "analytics.html",
    "property-details.html"
)

$projectRoot = "c:\E Drive\rentanything"

foreach ($file in $htmlFiles) {
    $filePath = Join-Path $projectRoot $file
    
    if (Test-Path $filePath) {
        Write-Host "Processing: $file"
        
        $content = Get-Content $filePath -Raw
        
        # Pattern to match the duplicate script block
        $pattern = '(?s)\s*<!-- Scripts -->\s*<script type="module">.*?import \{ initHeader \} from.*?initMobileMenu\(\);.*?initFooter\(\);.*?<\/script>'
        
        # Remove the duplicate script block
        $newContent = $content -replace $pattern, ''
        
        # Write back to file
        Set-Content -Path $filePath -Value $newContent -NoNewline
        
        Write-Host "  ✓ Removed duplicate scripts from $file"
    } else {
        Write-Host "  ✗ File not found: $file" -ForegroundColor Yellow
    }
}

Write-Host "`nAll files processed!" -ForegroundColor Green
