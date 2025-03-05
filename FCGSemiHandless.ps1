Function getFf {
  try {
    Get-Process -Name firefox -ErrorAction Stop

    return (ps firefox) 
  } catch {
    return 0
  }
} 

Function moveWindow {
  param($ff, $a = 1)

  for ($i = 0; $i -lt $ff.count; $i++) {
    try {
      $NewDesktop | Move-Window ($ff[$i].MainWindowHandle) | Out-Null
      Write-Host "Sucess move $($ff[$i].id)"
      if($a) { return $ff[0].id }
    } catch {
      Start-Sleep -Milliseconds 10
    }
  }

  throw "Error handle not found"
}

$NewDesktop = New-Desktop 
$NewDesktop | Set-DesktopName -Name "FCGSemiHandless"

<#$NewDesktop | Move-Window (Get-ConsoleHandle) | Out-Null#>
$NewDesktop | Move-Window ((ps cmd)[0].MainWindowHandle) | Out-Null

<# if you use firefox as default browser you need to set $onlyFirst = 0 #>
$onlyFirst = 1
$id = 0

while(1) {  
  try
  {
    $ff = $(getFf)
    if($onlyFirst -eq 1) {
      if(!($ff[0].id -is [int]) -or ($ff[0].id -eq 0)){
        throw "Process not found"
      }

      if ($ff[0].id -eq $id){ 
        throw "Dont move same process"
      }

      $id = $(moveWindow $ff)
    } else {
      <#Spam mode#>
      $(moveWindow $ff 0)
    }
  } catch {
     Start-Sleep -Milliseconds 100
  } 
}

