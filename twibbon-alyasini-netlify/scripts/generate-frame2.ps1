[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Drawing

function Build-TwibbonFrameVariant2 {
    param(
        [string]$OutputPath
    )

    $width = 1080
    $height = 1080
    $bmp = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    $cDarkGreen = [System.Drawing.ColorTranslator]::FromHtml("#006d4e")
    $cForest = [System.Drawing.ColorTranslator]::FromHtml("#004e38")
    $cGold = [System.Drawing.ColorTranslator]::FromHtml("#FBCE07")
    $cWhite = [System.Drawing.Color]::White

    $g.Clear([System.Drawing.Color]::Transparent)

    # Frame Cutout: Rounded Rectangle
    $holeW = 760
    $holeH = 680
    $holeX = [int](($width - $holeW) / 2) # 160
    $holeY = 140
    $radius = 48

    # Rounded rect path helper
    function Get-RoundedRectPath($x, $y, $w, $h, $r) {
        $p = New-Object System.Drawing.Drawing2D.GraphicsPath
        $d = $r * 2
        $p.AddArc($x, $y, $d, $d, 180, 90)
        $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
        $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
        $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
        $p.CloseFigure()
        return $p
    }

    $outerPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $outerPath.AddRectangle((New-Object System.Drawing.Rectangle(0, 0, $width, $height)))

    $holePath = Get-RoundedRectPath $holeX $holeY $holeW $holeH $radius

    $region = New-Object System.Drawing.Region($outerPath)
    $region.Exclude($holePath)
    $g.Clip = $region

    # Background gradient
    $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.Rectangle(0, 0, $width, $height)),
        $cDarkGreen,
        $cForest,
        90.0
    )
    $g.FillRectangle($bgBrush, 0, 0, $width, $height)

    # Supergrafis geometric bands
    $penGold = New-Object System.Drawing.Pen($cGold, 50)
    $penEmerald = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(150, 0, 168, 107), 70)
    $penGoldThin = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(140, 251, 206, 7), 20)

    $g.DrawLine($penEmerald, -80, 220, 320, -180)
    $g.DrawLine($penGold, -60, 140, 240, -160)
    $g.DrawLine($penGoldThin, -40, 80, 180, -140)

    $g.DrawLine($penEmerald, 700, 1180, 1180, 700)
    $g.DrawLine($penGold, 780, 1180, 1180, 780)
    $g.DrawLine($penGoldThin, 860, 1180, 1180, 860)

    $g.ResetClip()

    # Borders around rounded hole
    $penOuter = New-Object System.Drawing.Pen($cGold, 12)
    $g.DrawPath($penOuter, $holePath)

    $holeInnerPath = Get-RoundedRectPath ($holeX + 8) ($holeY + 8) ($holeW - 16) ($holeH - 16) ($radius - 4)
    $penInner = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(200, 255, 255, 255), 4)
    $g.DrawPath($penInner, $holeInnerPath)

    # Header elements
    $formatCenter = New-Object System.Drawing.StringFormat
    $formatCenter.Alignment = [System.Drawing.StringAlignment]::Center

    $fontPesantren = New-Object System.Drawing.Font("Arial", 20, [System.Drawing.FontStyle]::Bold)
    $brushWhite = New-Object System.Drawing.SolidBrush($cWhite)
    $g.DrawString("PONDOK PESANTREN TERPADU AL-YASINI", $fontPesantren, $brushWhite, ($width / 2), 40, $formatCenter)

    $fontSub = New-Object System.Drawing.Font("Arial", 13, [System.Drawing.FontStyle]::Bold)
    $brushGold = New-Object System.Drawing.SolidBrush($cGold)
    $g.DrawString("SILATNAS INSANI ALYASINI & HAUL MASYAYIKH KE-24", $fontSub, $brushGold, ($width / 2), 75, $formatCenter)

    # Bottom Area with Logo
    $cardW = 980
    $cardH = 200
    $cardX = [int](($width - $cardW) / 2)
    $cardY = 840

    $cardBrush = New-Object System.Drawing.SolidBrush($cWhite)
    $g.FillRectangle($cardBrush, $cardX, $cardY, $cardW, $cardH)

    $cardAccent = New-Object System.Drawing.SolidBrush($cGold)
    $g.FillRectangle($cardAccent, $cardX, $cardY, $cardW, 6)

    $logoPath = "C:\Users\USER\.gemini\antigravity\scratch\twibbon-alyasini\public\assets\logo-alyasini.png"
    if (Test-Path $logoPath) {
        $logoImg = [System.Drawing.Image]::FromFile($logoPath)
        $targetLogoH = 130
        $targetLogoW = [int]($targetLogoH * 3.605)
        $targetLogoX = [int](($width - $targetLogoW) / 2)
        $targetLogoY = $cardY + 16
        $g.DrawImage($logoImg, $targetLogoX, $targetLogoY, $targetLogoW, $targetLogoH)
        $logoImg.Dispose()
    }

    $fontTagline = New-Object System.Drawing.Font("Arial", 12, [System.Drawing.FontStyle]::Bold)
    $brushGreen = New-Object System.Drawing.SolidBrush($cDarkGreen)
    $g.DrawString("Pasuruan, Jawa Timur   |   Ayo Ramaikan & Pasang Twibbon!", $fontTagline, $brushGreen, ($width / 2), $cardY + $cardH - 30, $formatCenter)

    $bmp.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Output "Variant 2 saved to: $OutputPath"
}

Build-TwibbonFrameVariant2 -OutputPath "C:\Users\USER\.gemini\antigravity\scratch\twibbon-alyasini\public\assets\frame-variant-2.png"
Copy-Item "C:\Users\USER\.gemini\antigravity\scratch\twibbon-alyasini\public\assets\frame-variant-2.png" "C:\Users\USER\.gemini\antigravity\scratch\twibbon-alyasini\public\uploads\frame-silatnas-modern.png" -Force
