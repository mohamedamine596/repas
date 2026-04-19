$ErrorActionPreference = 'Stop'
$base = 'http://localhost:4105/api'

function Invoke-Api {
  param(
    [string]$Method,
    [string]$Path,
    [object]$Body = $null,
    [Microsoft.PowerShell.Commands.WebRequestSession]$Session = $null,
    [hashtable]$Headers = $null
  )

  $params = @{
    Uri = "$base$Path"
    Method = $Method
    ErrorAction = 'Stop'
  }

  if ($PSVersionTable.PSVersion.Major -lt 6) {
    $params.UseBasicParsing = $true
  }

  if ($Session) { $params.WebSession = $Session }
  if ($Headers) { $params.Headers = $Headers }

  if ($null -ne $Body) {
    $params.Body = ($Body | ConvertTo-Json -Depth 30 -Compress)
    $params.ContentType = 'application/json'
  }

  try {
    $resp = Invoke-WebRequest @params
    $data = $null
    if ($resp.Content) {
      try { $data = $resp.Content | ConvertFrom-Json } catch { $data = $null }
    }
    return [pscustomobject]@{
      StatusCode = [int]$resp.StatusCode
      Data = $data
      Raw = $resp.Content
    }
  }
  catch {
    $status = 0
    $raw = ''
    if ($_.Exception.Response) {
      $status = [int]$_.Exception.Response.StatusCode.value__
      $stream = $_.Exception.Response.GetResponseStream()
      if ($stream) {
        $reader = New-Object System.IO.StreamReader($stream)
        $raw = $reader.ReadToEnd()
        $reader.Close()
      }
    }
    $data = $null
    if ($raw) {
      try { $data = $raw | ConvertFrom-Json } catch { $data = $null }
    }
    return [pscustomobject]@{
      StatusCode = $status
      Data = $data
      Raw = $raw
    }
  }
}

$report = New-Object System.Collections.Generic.List[Object]
function Add-Check {
  param([string]$Name, [bool]$Passed, [string]$Info)
  $report.Add([pscustomobject]@{
    Name = $Name
    Passed = $Passed
    Info = $Info
  }) | Out-Null
}

$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$pwd = 'Pass12345!'
$newPwd = 'Pass67890!'

$emailReceiver = "receiver.$stamp@example.com"
$emailDonorFail = "donorfail.$stamp@example.com"
$emailDonorPass = "donorpass.$stamp@example.com"
$emailReset = "reset.$stamp@example.com"
$emailResend = "resend.$stamp@example.com"

$health = Invoke-Api -Method 'GET' -Path '/health'
Add-Check 'health endpoint' (($health.StatusCode -eq 200) -and ($health.Data.ok -eq $true)) "status=$($health.StatusCode)"

$receiverReg = Invoke-Api -Method 'POST' -Path '/auth/register' -Body @{ name='Receiver Test'; email=$emailReceiver; password=$pwd; role='RECEIVER' }
$receiverOtp = $receiverReg.Data.otpDebugCode
Add-Check 'receiver register' (($receiverReg.StatusCode -eq 201) -and [string]::IsNullOrEmpty($receiverOtp) -eq $false) "status=$($receiverReg.StatusCode)"

$receiverLoginBeforeOtp = Invoke-Api -Method 'POST' -Path '/auth/login' -Body @{ email=$emailReceiver; password=$pwd }
Add-Check 'receiver login blocked before OTP' (($receiverLoginBeforeOtp.StatusCode -eq 403) -and ($receiverLoginBeforeOtp.Data.code -eq 'EMAIL_OTP_REQUIRED')) "status=$($receiverLoginBeforeOtp.StatusCode); code=$($receiverLoginBeforeOtp.Data.code)"

$receiverSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$receiverVerify = Invoke-Api -Method 'POST' -Path '/auth/otp/verify' -Body @{ email=$emailReceiver; code=$receiverOtp } -Session $receiverSession
$receiverToken = $receiverVerify.Data.accessToken
Add-Check 'receiver OTP verify' (($receiverVerify.StatusCode -eq 200) -and ($receiverVerify.Data.user.role -eq 'RECEIVER') -and ($receiverVerify.Data.user.accountStatus -eq 'active')) "status=$($receiverVerify.StatusCode); role=$($receiverVerify.Data.user.role); statusField=$($receiverVerify.Data.user.accountStatus)"

$receiverMe = Invoke-Api -Method 'GET' -Path '/auth/me' -Headers @{ Authorization = "Bearer $receiverToken" } -Session $receiverSession
Add-Check 'receiver me after OTP' (($receiverMe.StatusCode -eq 200) -and ($receiverMe.Data.user.email -eq $emailReceiver)) "status=$($receiverMe.StatusCode)"

$donorFailReg = Invoke-Api -Method 'POST' -Path '/auth/register' -Body @{ name='Donor Fail'; email=$emailDonorFail; password=$pwd; role='DONOR' }
$donorFailOtp = $donorFailReg.Data.otpDebugCode
Add-Check 'donor register (fail path)' (($donorFailReg.StatusCode -eq 201) -and [string]::IsNullOrEmpty($donorFailOtp) -eq $false) "status=$($donorFailReg.StatusCode)"

$donorFailLoginBeforeOtp = Invoke-Api -Method 'POST' -Path '/auth/login' -Body @{ email=$emailDonorFail; password=$pwd }
Add-Check 'donor login blocked before OTP' (($donorFailLoginBeforeOtp.StatusCode -eq 403) -and ($donorFailLoginBeforeOtp.Data.code -eq 'DONOR_EMAIL_PENDING')) "status=$($donorFailLoginBeforeOtp.StatusCode); code=$($donorFailLoginBeforeOtp.Data.code)"

$donorFailSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$donorFailVerify = Invoke-Api -Method 'POST' -Path '/auth/otp/verify' -Body @{ email=$emailDonorFail; code=$donorFailOtp } -Session $donorFailSession
$donorFailToken = $donorFailVerify.Data.accessToken
Add-Check 'donor OTP verify (fail path user)' (($donorFailVerify.StatusCode -eq 200) -and ($donorFailVerify.Data.user.accountStatus -eq 'email_verified')) "status=$($donorFailVerify.StatusCode); accountStatus=$($donorFailVerify.Data.user.accountStatus)"

$quizFail1 = Invoke-Api -Method 'POST' -Path '/auth/donor-quiz/submit' -Body @{ answers=@(0,0,0,0,0) } -Headers @{ Authorization = "Bearer $donorFailToken" }
Add-Check 'donor quiz fail attempt 1' (($quizFail1.StatusCode -eq 200) -and ($quizFail1.Data.passed -eq $false) -and ($quizFail1.Data.attempts -eq 1) -and ($quizFail1.Data.attemptsRemaining -eq 1)) "status=$($quizFail1.StatusCode); attempts=$($quizFail1.Data.attempts); remaining=$($quizFail1.Data.attemptsRemaining)"

$quizFailCooldown = Invoke-Api -Method 'POST' -Path '/auth/donor-quiz/submit' -Body @{ answers=@(0,0,0,0,0) } -Headers @{ Authorization = "Bearer $donorFailToken" }
Add-Check 'donor quiz cooldown enforced' (($quizFailCooldown.StatusCode -eq 429) -and ($quizFailCooldown.Data.code -eq 'QUIZ_COOLDOWN')) "status=$($quizFailCooldown.StatusCode); code=$($quizFailCooldown.Data.code)"

$dbPath = Join-Path (Get-Location) 'backend\data\db.json'
$db = Get-Content -Raw $dbPath | ConvertFrom-Json
$dbUserFail = $db.users | Where-Object { $_.email -eq $emailDonorFail } | Select-Object -First 1
if ($dbUserFail -and $dbUserFail.donorQuiz) {
  $dbUserFail.donorQuiz.cooldownUntil = (Get-Date).AddSeconds(-2).ToString('o')
  ($db | ConvertTo-Json -Depth 30) | Set-Content -Path $dbPath
}

$quizFail2 = Invoke-Api -Method 'POST' -Path '/auth/donor-quiz/submit' -Body @{ answers=@(0,0,0,0,0) } -Headers @{ Authorization = "Bearer $donorFailToken" }
Add-Check 'donor suspended after 2nd failed quiz' (($quizFail2.StatusCode -eq 200) -and ($quizFail2.Data.attempts -eq 2) -and ($quizFail2.Data.attemptsRemaining -eq 0) -and ($quizFail2.Data.accountStatus -eq 'suspended')) "status=$($quizFail2.StatusCode); accountStatus=$($quizFail2.Data.accountStatus); remaining=$($quizFail2.Data.attemptsRemaining)"

$donorFailLoginSuspended = Invoke-Api -Method 'POST' -Path '/auth/login' -Body @{ email=$emailDonorFail; password=$pwd }
Add-Check 'suspended donor login blocked' (($donorFailLoginSuspended.StatusCode -eq 403) -and ($donorFailLoginSuspended.Data.code -eq 'ACCOUNT_SUSPENDED')) "status=$($donorFailLoginSuspended.StatusCode); code=$($donorFailLoginSuspended.Data.code)"

$donorPassReg = Invoke-Api -Method 'POST' -Path '/auth/register' -Body @{ name='Donor Pass'; email=$emailDonorPass; password=$pwd; role='DONOR' }
$donorPassOtp = $donorPassReg.Data.otpDebugCode
Add-Check 'donor register (pass path)' (($donorPassReg.StatusCode -eq 201) -and [string]::IsNullOrEmpty($donorPassOtp) -eq $false) "status=$($donorPassReg.StatusCode)"

$donorPassSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$donorPassVerify = Invoke-Api -Method 'POST' -Path '/auth/otp/verify' -Body @{ email=$emailDonorPass; code=$donorPassOtp } -Session $donorPassSession
$donorPassToken = $donorPassVerify.Data.accessToken
Add-Check 'donor OTP verify (pass path user)' (($donorPassVerify.StatusCode -eq 200) -and ($donorPassVerify.Data.user.accountStatus -eq 'email_verified')) "status=$($donorPassVerify.StatusCode); accountStatus=$($donorPassVerify.Data.user.accountStatus)"

$quizPass = Invoke-Api -Method 'POST' -Path '/auth/donor-quiz/submit' -Body @{ answers=@(1,2,1,2,2) } -Headers @{ Authorization = "Bearer $donorPassToken" }
Add-Check 'donor quiz pass to pending review' (($quizPass.StatusCode -eq 200) -and ($quizPass.Data.passed -eq $true) -and ($quizPass.Data.accountStatus -eq 'pending_admin_review')) "status=$($quizPass.StatusCode); passed=$($quizPass.Data.passed); accountStatus=$($quizPass.Data.accountStatus)"

$donorPassLoginPending = Invoke-Api -Method 'POST' -Path '/auth/login' -Body @{ email=$emailDonorPass; password=$pwd }
Add-Check 'donor pending review login blocked' (($donorPassLoginPending.StatusCode -eq 403) -and ($donorPassLoginPending.Data.code -eq 'DONOR_PENDING_ADMIN_REVIEW')) "status=$($donorPassLoginPending.StatusCode); code=$($donorPassLoginPending.Data.code)"

$adminSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$adminLogin = Invoke-Api -Method 'POST' -Path '/auth/login' -Body @{ email='admin@coeurtablepartage.com'; password='Admin123456!' } -Session $adminSession
$adminToken = $adminLogin.Data.accessToken
Add-Check 'admin login' (($adminLogin.StatusCode -eq 200) -and ($adminLogin.Data.user.role -eq 'ADMIN')) "status=$($adminLogin.StatusCode); role=$($adminLogin.Data.user.role)"

$pendingList = Invoke-Api -Method 'GET' -Path '/admin/verifications?status=PENDING' -Headers @{ Authorization = "Bearer $adminToken" }
$verificationRecord = $pendingList.Data.verifications | Where-Object { $_.user.email -eq $emailDonorPass } | Select-Object -First 1
$verificationId = if ($verificationRecord) { $verificationRecord.id } else { $null }
Add-Check 'admin sees pending quiz verification' (($pendingList.StatusCode -eq 200) -and [string]::IsNullOrEmpty($verificationId) -eq $false) "status=$($pendingList.StatusCode); verificationId=$verificationId"

$approve = $null
if ($verificationId) {
  $approve = Invoke-Api -Method 'PUT' -Path "/admin/verifications/$verificationId" -Body @{ status='APPROVED'; reason='' } -Headers @{ Authorization = "Bearer $adminToken" }
}
Add-Check 'admin approves donor verification' (($approve -ne $null) -and ($approve.StatusCode -eq 200) -and ($approve.Data.verification.status -eq 'APPROVED')) "status=$($approve.StatusCode); resultStatus=$($approve.Data.verification.status)"

$donorPassLoginAfterApprove = Invoke-Api -Method 'POST' -Path '/auth/login' -Body @{ email=$emailDonorPass; password=$pwd }
Add-Check 'approved donor login succeeds' (($donorPassLoginAfterApprove.StatusCode -eq 200) -and ($donorPassLoginAfterApprove.Data.user.accountStatus -eq 'active')) "status=$($donorPassLoginAfterApprove.StatusCode); accountStatus=$($donorPassLoginAfterApprove.Data.user.accountStatus)"

$lockAttempt = $null
for ($i = 1; $i -le 5; $i++) {
  $lockAttempt = Invoke-Api -Method 'POST' -Path '/auth/login' -Body @{ email=$emailReceiver; password='Wrong12345!' }
}
Add-Check '5 failed logins triggers lockout' (($lockAttempt.StatusCode -eq 423) -and ($lockAttempt.Data.code -eq 'ACCOUNT_LOCKED')) "status=$($lockAttempt.StatusCode); code=$($lockAttempt.Data.code)"

$lockCorrect = Invoke-Api -Method 'POST' -Path '/auth/login' -Body @{ email=$emailReceiver; password=$pwd }
Add-Check 'locked account blocks correct password' (($lockCorrect.StatusCode -eq 423) -and ($lockCorrect.Data.code -eq 'ACCOUNT_LOCKED')) "status=$($lockCorrect.StatusCode); code=$($lockCorrect.Data.code)"

$resetReg = Invoke-Api -Method 'POST' -Path '/auth/register' -Body @{ name='Reset User'; email=$emailReset; password=$pwd; role='RECEIVER' }
$resetOtp = $resetReg.Data.otpDebugCode
$resetVerify = Invoke-Api -Method 'POST' -Path '/auth/otp/verify' -Body @{ email=$emailReset; code=$resetOtp }
Add-Check 'reset-flow user OTP verified' (($resetVerify.StatusCode -eq 200) -and ($resetVerify.Data.user.accountStatus -eq 'active')) "status=$($resetVerify.StatusCode)"

$forgot = Invoke-Api -Method 'POST' -Path '/auth/forgot-password' -Body @{ email=$emailReset }
$debugResetToken = $forgot.Data.resetDebugToken
Add-Check 'forgot password issues reset token' (($forgot.StatusCode -eq 200) -and [string]::IsNullOrEmpty($debugResetToken) -eq $false) "status=$($forgot.StatusCode); tokenPresent=$([string]::IsNullOrEmpty($debugResetToken) -eq $false)"

$resetPassword = Invoke-Api -Method 'POST' -Path '/auth/reset-password' -Body @{ email=$emailReset; token=$debugResetToken; password=$newPwd }
Add-Check 'reset password success' ($resetPassword.StatusCode -eq 200) "status=$($resetPassword.StatusCode)"

$oldPwdLogin = Invoke-Api -Method 'POST' -Path '/auth/login' -Body @{ email=$emailReset; password=$pwd }
Add-Check 'old password rejected after reset' (($oldPwdLogin.StatusCode -eq 401) -and ($oldPwdLogin.Data.code -eq 'INVALID_CREDENTIALS')) "status=$($oldPwdLogin.StatusCode); code=$($oldPwdLogin.Data.code)"

$newPwdLogin = Invoke-Api -Method 'POST' -Path '/auth/login' -Body @{ email=$emailReset; password=$newPwd }
Add-Check 'new password works after reset' ($newPwdLogin.StatusCode -eq 200) "status=$($newPwdLogin.StatusCode)"

$resendReg = Invoke-Api -Method 'POST' -Path '/auth/register' -Body @{ name='Resend User'; email=$emailResend; password=$pwd; role='RECEIVER' }
$resendCooldown = Invoke-Api -Method 'POST' -Path '/auth/otp/resend' -Body @{ email=$emailResend }
Add-Check 'OTP resend cooldown enforced' (($resendCooldown.StatusCode -eq 429) -and ($resendCooldown.Data.code -eq 'OTP_RESEND_COOLDOWN')) "status=$($resendCooldown.StatusCode); code=$($resendCooldown.Data.code)"

$report | ForEach-Object {
  $tag = if ($_.Passed) { 'PASS' } else { 'FAIL' }
  Write-Output ("[$tag] $($_.Name) :: $($_.Info)")
}

$failed = $report | Where-Object { -not $_.Passed }
Write-Output ("TOTAL_CHECKS=$($report.Count)")
Write-Output ("FAILED_CHECKS=$($failed.Count)")

if ($failed.Count -gt 0) { exit 1 } else { exit 0 }
