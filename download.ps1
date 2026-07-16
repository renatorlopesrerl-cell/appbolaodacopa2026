$urls = @{
  "129" = "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Cear%C3%A1_Sporting_Club_logo.svg/512px-Cear%C3%A1_Sporting_Club_logo.svg.png"
  "144" = "https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Atl%C3%A9tico_Clube_Goianiense.svg/512px-Atl%C3%A9tico_Clube_Goianiense.svg.png"
  "149" = "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Paysandu_Sport_Club_logo.svg/512px-Paysandu_Sport_Club_logo.svg.png"
  "146" = "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Clube_de_Regatas_Brasil_logo.svg/512px-Clube_de_Regatas_Brasil_logo.svg.png"
  "152" = "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Esporte_Clube_Juventude_logo.svg/512px-Esporte_Clube_Juventude_logo.svg.png"
  "7772" = "https://upload.wikimedia.org/wikipedia/pt/2/23/Associa%C3%A7%C3%A3o_Desportiva_Confian%C3%A7a_logo.svg"
  "18271" = "https://upload.wikimedia.org/wikipedia/pt/f/fb/Barra_Futebol_Clube_logo.png"
  "151" = "https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Goi%C3%A1s_Esporte_Clube_logo.svg/512px-Goi%C3%A1s_Esporte_Clube_logo.svg.png"
  "154" = "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/Fortaleza_Esporte_Clube_logo.svg/512px-Fortaleza_Esporte_Clube_logo.svg.png"
  "13975" = "https://upload.wikimedia.org/wikipedia/pt/8/86/Escudo_Athletic_Club.png"
  "7831" = "https://upload.wikimedia.org/wikipedia/pt/f/f3/Esporte_Clube_Jacuipense_logo.png"
  "1223" = "https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Oper%C3%A1rio_Ferrovi%C3%A1rio_Esporte_Clube_logo.svg/512px-Oper%C3%A1rio_Ferrovi%C3%A1rio_Esporte_Clube_logo.svg.png"
}

foreach ($id in $urls.Keys) {
  $url = $urls[$id]
  $ext = if ($url.EndsWith('.svg')) { '.svg' } else { '.png' }
  $dest = "public\img\teams\brasileirao\$id$ext"
  Write-Host "Downloading $id..."
  Invoke-WebRequest -Uri $url -OutFile $dest -UserAgent "AntigravityBot/1.0"
}
