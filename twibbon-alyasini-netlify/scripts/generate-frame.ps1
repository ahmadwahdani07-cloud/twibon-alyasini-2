[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Drawing

function Build-TwibbonFrame {
    param(
        [string]$OutputPath,
        [int]$Variant = 1
    )

    $width = 1080
    $height = 1080
    $bmp = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    # Colors from Brand Guidelines
    $cDarkGreen = [System.Drawing.ColorTranslator]::FromHtml("#006d4e")
    $cForest = [System.Drawing.ColorTranslator]::FromHtml("#004e38")
    $cLightGreen = [System.Drawing.ColorTranslator]::FromHtml("#00a86b")
    $cNeonGreen = [System.Drawing.ColorTranslator]::FromHtml("#10b981")
    $cGold = [System.Drawing.ColorTranslator]::FromHtml("#FBCE07")
    $cGoldWarm = [System.Drawing.ColorTranslator]::FromHtml("#f59e0b")
    $cWhite = [System.Drawing.Color]::White

    $g.Clear([System.Drawing.Color]::Transparent)

    # Frame Cutout: Circle
    $holeSize = 640
    $holeX = [int](($width - $holeSize) / 2) # 220
    $holeY = 160

    # Path for outer area
    $outerPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $outerPath.AddRectangle((New-Object System.Drawing.Rectangle(0, 0, $width, $height)))

    $holePath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $holePath.AddEllipse($holeX, $holeY, $holeSize, $holeSize)

    $region = New-Object System.Drawing.Region($outerPath)
    $region.Exclude($holePath)
    $g.Clip = $region

    # 1. Fill base background with elegant gradient
    $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.Rectangle(0, 0, $width, $height)),
        $cForest,
        $cDarkGreen,
        45.0
    )
    $g.FillRectangle($bgBrush, 0, 0, $width, $height)

    # 2. Draw Supergrafis ribbons (Brand Guide page 9 - 45-degree angle bands)
    $penGold = New-Object System.Drawing.Pen($cGold, 42)
    $penEmerald = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(180, 0, 168, 107), 64)
    $penDarkAccent = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(120, 0, 56, 39), 80)
    $penGoldThin = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(140, 251, 206, 7), 16)

    # Top-Left ribbons
    $g.DrawLine($penDarkAccent, -100, 280, 280, -100)
    $g.DrawLine($penEmerald, -80, 200, 320, -200)
    $g.DrawLine($penGold, -60, 120, 240, -180)
    $g.DrawLine($penGoldThin, -40, 60, 180, -160)

    # Bottom-Right ribbons
    $g.DrawLine($penDarkAccent, 650, 1180, 1180, 650)
    $g.DrawLine($penEmerald, 720, 1180, 1180, 720)
    $g.DrawLine($penGold, 800, 1180, 1180, 800)
    $g.DrawLine($penGoldThin, 880, 1180, 1180, 880)

    # Top-Right geometric touch
    $g.DrawLine($penEmerald, 920, -50, 1150, 180)
    $g.DrawLine($penGoldThin, 980, -30, 1150, 140)

    # Bottom-Left geometric touch
    $g.DrawLine($penEmerald, -60, 920, 180, 1160)
    $g.DrawLine($penGoldThin, -40, 980, 140, 1160)

    # Release clip to draw borders and sharp content
    $g.ResetClip()

    # 3. Outer ring glow & multi-layered rings around the hole
    $shadowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(70, 0, 0, 0))
    $g.FillEllipse($shadowBrush, $holeX - 10, $holeY - 10, $holeSize + 20, $holeSize + 20)

    # Outer Emerald ring
    $penRingOuter = New-Object System.Drawing.Pen($cDarkGreen, 24)
    $g.DrawEllipse($penRingOuter, $holeX, $holeY, $holeSize, $holeSize)

    # Middle Gold ring
    $penRingGold = New-Object System.Drawing.Pen($cGold, 8)
    $g.DrawEllipse($penRingGold, $holeX + 2, $holeY + 2, $holeSize - 4, $holeSize - 4)

    # Inner White crisp accent
    $penRingInner = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(230, 255, 255, 255), 3)
    $g.DrawEllipse($penRingInner, $holeX + 7, $holeY + 7, $holeSize - 14, $holeSize - 14)

    # 4. Top Header Content
    $formatCenter = New-Object System.Drawing.StringFormat
    $formatCenter.Alignment = [System.Drawing.StringAlignment]::Center

    # Top gold badge pill
    $pillW = 380
    $pillH = 34
    $pillX = ($width - $pillW) / 2
    $pillY = 32
    $pillBrush = New-Object System.Drawing.SolidBrush($cGold)
    $g.FillRectangle($pillBrush, $pillX, $pillY, $pillW, $pillH)

    $fontPill = New-Object System.Drawing.Font("Arial", 12, [System.Drawing.FontStyle]::Bold)
    $brushDark = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#111827"))
    $g.DrawString("SUKSESKAN & SEMARAKKAN", $fontPill, $brushDark, ($width / 2), $pillY + 8, $formatCenter)

    $fontPesantren = New-Object System.Drawing.Font("Arial", 18, [System.Drawing.FontStyle]::Bold)
    $brushWhite = New-Object System.Drawing.SolidBrush($cWhite)
    $g.DrawString("PONDOK PESANTREN TERPADU AL-YASINI", $fontPesantren, $brushWhite, ($width / 2), 80, $formatCenter)

    $fontLoc = New-Object System.Drawing.Font("Arial", 13, [System.Drawing.FontStyle]::Regular)
    $brushLoc = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(230, 251, 206, 7))
    $g.DrawString("ARENG-ARENG, WONOREJO, PASURUAN - JAWA TIMUR", $fontLoc, $brushLoc, ($width / 2), 110, $formatCenter)

    # 5. Bottom Card with Logo & Details
    $cardW = 980
    $cardH = 210
    $cardX = [int](($width - $cardW) / 2) # 50
    $cardY = 825

    # Shadow
    $cardShadow = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(90, 0, 0, 0))
    $g.FillRectangle($cardShadow, $cardX + 4, $cardY + 6, $cardW, $cardH)

    # White Card
    $cardBrush = New-Object System.Drawing.SolidBrush($cWhite)
    $g.FillRectangle($cardBrush, $cardX, $cardY, $cardW, $cardH)

    # Top Golden Accent line on card
    $cardAccent = New-Object System.Drawing.SolidBrush($cGold)
    $g.FillRectangle($cardAccent, $cardX, $cardY, $cardW, 6)

    # Draw Official Logo inside bottom card
    $logoPath = "C:\Users\USER\.gemini\antigravity\scratch\twibbon-alyasini\public\assets\logo-alyasini.png"
    if (Test-Path $logoPath) {
        $logoImg = [System.Drawing.Image]::FromFile($logoPath)
        # Logo aspect ratio: 1024 / 284 = 3.605
        # Allocate height ~ 140 -> width = 140 * 3.605 = 505
        $targetLogoH = 138
        $targetLogoW = [int]($targetLogoH * 3.605) # ~ 497
        $targetLogoX = [int](($width - $targetLogoW) / 2)
        $targetLogoY = $cardY + 16
        $g.DrawImage($logoImg, $targetLogoX, $targetLogoY, $targetLogoW, $targetLogoH)
        $logoImg.Dispose()
    }

    # Footer note below logo
    $fontTagline = New-Object System.Drawing.Font("Arial", 12, [System.Drawing.FontStyle]::Bold)
    $brushGreen = New-Object System.Drawing.SolidBrush($cDarkGreen)
    $g.DrawString("1447 H / 2026 M   |   #HaulMasyayikh24   #SilatnasInsaniAlyasini", $fontTagline, $brushGreen, ($width / 2), $cardY + $cardH - 32, $formatCenter)

    $bmp.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Output "Twibbon Frame saved to: $OutputPath"
}

Build-TwibbonFrame -OutputPath "C:\Users\USER\.gemini\antigravity\scratch\twibbon-alyasini\public\assets\default-frame.png" -Variant 1
Copy-Item "C:\Users\USER\.gemini\antigravity\scratch\twibbon-alyasini\public\assets\default-frame.png" "C:\Users\USER\.gemini\antigravity\scratch\twibbon-alyasini\public\uploads\frame-haul-24.png" -Force
