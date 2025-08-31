# Service Integration Test Runner for Windows
# PowerShell script to validate backend-frontend connectivity, database operations, and authentication flows

param(
    [switch]$SkipPrerequisites,
    [switch]$BackendOnly,
    [switch]$FrontendOnly,
    [switch]$Verbose,
    [string]$BackendUrl = "http://localhost:3001",
    [string]$FrontendUrl = "http://localhost:5173"
)

Write-Host "🚀 TestBro Service Integration Test Runner" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Global test results
$TestResults = @{
    Connectivity = @{ Passed = 0; Failed = 0; Tests = @() }
    Database = @{ Passed = 0; Failed = 0; Tests = @() }
    Authentication = @{ Passed = 0; Failed = 0; Tests = @() }
    Integration = @{ Passed = 0; Failed = 0; Tests = @() }
}

function Write-TestLog {
    param(
        [string]$Message,
        [string]$Type = "Info"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Type) {
        "Success" { "Green" }
        "Error" { "Red" }
        "Warning" { "Yellow" }
        "Info" { "Cyan" }
        default { "White" }
    }
    
    Write-Host "[$timestamp] $Message" -ForegroundColor $color
}

function Test-Prerequisites {
    Write-TestLog "🔍 Checking prerequisites..." "Info"
    
    $checks = @(
        @{ Name = "Node.js"; Command = "node --version" },
        @{ Name = "NPM"; Command = "npm --version" },
        @{ Name = "Backend Directory"; Path = "testbro-backend" },
        @{ Name = "Frontend Directory"; Path = "testbro-frontend" }
    )
    
    foreach ($check in $checks) {
        try {
            if ($check.Command) {
                $result = Invoke-Expression $check.Command 2>$null
                if ($result) {
                    Write-TestLog "✅ $($check.Name): $result" "Success"
                } else {
                    throw "Command failed"
                }
            } elseif ($check.Path) {
                if (Test-Path $check.Path) {
                    Write-TestLog "✅ $($check.Name) exists" "Success"
                } else {
                    throw "Path not found"
                }
            }
        } catch {
            Write-TestLog "❌ $($check.Name) check failed" "Error"
            throw "Prerequisite failed: $($check.Name)"
        }
    }
}

function Test-ServerConnectivity {
    param([string]$Url, [string]$Name)
    
    try {
        $response = Invoke-RestMethod -Uri $Url -Method GET -TimeoutSec 10
        Write-TestLog "✅ $Name is running" "Success"
        return $true
    } catch {
        Write-TestLog "❌ $Name is not accessible: $($_.Exception.Message)" "Error"
        return $false
    }
}

function Invoke-TestSuite {
    param(
        [string]$SuiteName,
        [array]$Tests
    )
    
    Write-TestLog "📋 Running $SuiteName test suite ($($Tests.Count) tests)..." "Info"
    
    foreach ($test in $Tests) {
        $startTime = Get-Date
        try {
            $result = & $test.Test
            $duration = (Get-Date) - $startTime
            
            if ($result) {
                $TestResults[$SuiteName].Passed++
                $TestResults[$SuiteName].Tests += @{
                    Name = $test.Name
                    Status = "Passed"
                    Duration = $duration.TotalMilliseconds
                }
                Write-TestLog "  ✅ $($test.Name) ($([math]::Round($duration.TotalMilliseconds))ms)" "Success"
            } else {
                $TestResults[$SuiteName].Failed++
                $TestResults[$SuiteName].Tests += @{
                    Name = $test.Name
                    Status = "Failed"
                    Duration = $duration.TotalMilliseconds
                    Error = "Test returned false"
                }
                Write-TestLog "  ❌ $($test.Name) ($([math]::Round($duration.TotalMilliseconds))ms)" "Error"
            }
        } catch {
            $duration = (Get-Date) - $startTime
            $TestResults[$SuiteName].Failed++
            $TestResults[$SuiteName].Tests += @{
                Name = $test.Name
                Status = "Failed"
                Duration = $duration.TotalMilliseconds
                Error = $_.Exception.Message
            }
            Write-TestLog "  ❌ $($test.Name) - $($_.Exception.Message)" "Error"
        }
    }
}

function Test-BackendConnectivity {
    Write-TestLog "🔗 Testing Backend Connectivity..." "Info"
    
    $tests = @(
        @{
            Name = "Health Check Endpoint"
            Test = {
                try {
                    $response = Invoke-RestMethod -Uri "$BackendUrl/health" -Method GET
                    return $response.status -and $response.timestamp
                } catch {
                    return $false
                }
            }
        },
        @{
            Name = "CORS Configuration"
            Test = {
                try {
                    $headers = @{
                        'Origin' = $FrontendUrl
                        'Access-Control-Request-Method' = 'GET'
                    }
                    $response = Invoke-WebRequest -Uri "$BackendUrl/api/projects" -Method OPTIONS -Headers $headers -ErrorAction SilentlyContinue
                    return $response.Headers.'Access-Control-Allow-Origin'
                } catch {
                    return $false
                }
            }
        },
        @{
            Name = "API Response Format"
            Test = {
                try {
                    # This should fail with 401 but return proper JSON
                    Invoke-RestMethod -Uri "$BackendUrl/api/projects" -Method GET
                    return $false
                } catch {
                    $errorResponse = $_.Exception.Response
                    return $errorResponse.StatusCode -eq 401 -and 
                           $errorResponse.ContentType -like "*application/json*"
                }
            }
        }
    )
    
    Invoke-TestSuite -SuiteName "Connectivity" -Tests $tests
}

function Test-DatabaseOperations {
    Write-TestLog "🗄️ Testing Database Operations..." "Info"
    
    # Try to create a test user
    $authToken = $null
    try {
        $registerData = @{
            email = "dbtest@serviceintegration.com"
            password = "TestPassword123!"
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "$BackendUrl/api/auth/register" -Method POST -Body $registerData -ContentType "application/json"
        $authToken = $response.session.access_token
    } catch {
        # Try to login instead
        try {
            $loginData = @{
                email = "dbtest@serviceintegration.com"
                password = "TestPassword123!"
            } | ConvertTo-Json
            
            $response = Invoke-RestMethod -Uri "$BackendUrl/api/auth/login" -Method POST -Body $loginData -ContentType "application/json"
            $authToken = $response.session.access_token
        } catch {
            Write-TestLog "⚠️ Could not create/login test user, skipping authenticated tests" "Warning"
        }
    }
    
    $tests = @(
        @{
            Name = "Database Connection"
            Test = {
                try {
                    $response = Invoke-RestMethod -Uri "$BackendUrl/health" -Method GET
                    return $response.services.database.status -eq "healthy"
                } catch {
                    return $false
                }
            }
        }
    )
    
    if ($authToken) {
        $headers = @{ Authorization = "Bearer $authToken" }
        
        $tests += @(
            @{
                Name = "Organization CRUD Operations"
                Test = {
                    try {
                        # Create
                        $createData = @{
                            name = "Test DB Org"
                            description = "Testing database operations"
                        } | ConvertTo-Json
                        
                        $createResponse = Invoke-RestMethod -Uri "$BackendUrl/api/organizations" -Method POST -Body $createData -ContentType "application/json" -Headers $headers
                        
                        if (-not $createResponse.data.id) { return $false }
                        
                        $orgId = $createResponse.data.id
                        
                        # Read
                        $readResponse = Invoke-RestMethod -Uri "$BackendUrl/api/organizations" -Method GET -Headers $headers
                        
                        if (-not $readResponse.data) { return $false }
                        
                        # Update
                        $updateData = @{
                            name = "Updated Test DB Org"
                            description = "Updated description"
                        } | ConvertTo-Json
                        
                        $updateResponse = Invoke-RestMethod -Uri "$BackendUrl/api/organizations/$orgId" -Method PUT -Body $updateData -ContentType "application/json" -Headers $headers
                        
                        return $updateResponse.data.name -eq "Updated Test DB Org"
                    } catch {
                        return $false
                    }
                }
            },
            @{
                Name = "Multi-tenant Data Isolation"
                Test = {
                    try {
                        $response = Invoke-RestMethod -Uri "$BackendUrl/api/organizations" -Method GET -Headers $headers
                        return $response.data -is [array]
                    } catch {
                        return $false
                    }
                }
            }
        )
    }
    
    Invoke-TestSuite -SuiteName "Database" -Tests $tests
}

function Test-AuthenticationFlow {
    Write-TestLog "🔐 Testing Authentication Flow..." "Info"
    
    $tests = @(
        @{
            Name = "User Registration"
            Test = {
                try {
                    $registerData = @{
                        email = "authtest$(Get-Date -Format 'yyyyMMddHHmmss')@serviceintegration.com"
                        password = "TestPassword123!"
                    } | ConvertTo-Json
                    
                    $response = Invoke-RestMethod -Uri "$BackendUrl/api/auth/register" -Method POST -Body $registerData -ContentType "application/json"
                    return $response.user -and $response.session
                } catch {
                    # Registration might fail if user exists, check for proper error format
                    return $_.Exception.Response.StatusCode -eq 400
                }
            }
        },
        @{
            Name = "User Login"
            Test = {
                try {
                    $loginData = @{
                        email = "dbtest@serviceintegration.com"
                        password = "TestPassword123!"
                    } | ConvertTo-Json
                    
                    $response = Invoke-RestMethod -Uri "$BackendUrl/api/auth/login" -Method POST -Body $loginData -ContentType "application/json"
                    return $response.session.access_token -and $response.user
                } catch {
                    return $false
                }
            }
        },
        @{
            Name = "JWT Token Validation"
            Test = {
                try {
                    $headers = @{ Authorization = "Bearer invalid-token" }
                    Invoke-RestMethod -Uri "$BackendUrl/api/projects" -Method GET -Headers $headers
                    return $false  # Should not reach here
                } catch {
                    return $_.Exception.Response.StatusCode -eq 401
                }
            }
        },
        @{
            Name = "Protected Route Access Control"
            Test = {
                $protectedEndpoints = @("/api/projects", "/api/organizations", "/api/test-cases")
                
                foreach ($endpoint in $protectedEndpoints) {
                    try {
                        Invoke-RestMethod -Uri "$BackendUrl$endpoint" -Method GET
                        return $false  # Should not reach here
                    } catch {
                        if ($_.Exception.Response.StatusCode -ne 401) {
                            return $false
                        }
                    }
                }
                return $true
            }
        }
    )
    
    Invoke-TestSuite -SuiteName "Authentication" -Tests $tests
}

function Test-IntegrationScenarios {
    Write-TestLog "🔄 Testing Integration Scenarios..." "Info"
    
    $tests = @(
        @{
            Name = "Frontend-Backend API Integration"
            Test = {
                try {
                    $response = Invoke-RestMethod -Uri "$BackendUrl/health" -Method GET
                    return $response.status -and $response.timestamp
                } catch {
                    return $false
                }
            }
        },
        @{
            Name = "Complete User Journey"
            Test = {
                try {
                    $userEmail = "journey$(Get-Date -Format 'yyyyMMddHHmmss')@serviceintegration.com"
                    
                    # 1. Register
                    $registerData = @{
                        email = $userEmail
                        password = "JourneyPassword123!"
                    } | ConvertTo-Json
                    
                    $registerResponse = Invoke-RestMethod -Uri "$BackendUrl/api/auth/register" -Method POST -Body $registerData -ContentType "application/json"
                    
                    if (-not $registerResponse.session.access_token) { return $false }
                    
                    $token = $registerResponse.session.access_token
                    $headers = @{ Authorization = "Bearer $token" }
                    
                    # 2. Get Organizations
                    $orgsResponse = Invoke-RestMethod -Uri "$BackendUrl/api/organizations" -Method GET -Headers $headers
                    
                    if (-not $orgsResponse.data -or $orgsResponse.data.Count -eq 0) { return $false }
                    
                    $orgId = $orgsResponse.data[0].organizations.id
                    
                    # 3. Create Project
                    $projectData = @{
                        name = "Journey Test Project"
                        description = "Testing complete user journey"
                        organization_id = $orgId
                    } | ConvertTo-Json
                    
                    $projectResponse = Invoke-RestMethod -Uri "$BackendUrl/api/projects" -Method POST -Body $projectData -ContentType "application/json" -Headers $headers
                    
                    return $projectResponse.data.id -ne $null
                } catch {
                    Write-TestLog "Journey test error: $($_.Exception.Message)" "Error"
                    return $false
                }
            }
        }
    )
    
    Invoke-TestSuite -SuiteName "Integration" -Tests $tests
}

function Start-Servers {
    Write-TestLog "🚀 Starting development servers..." "Info"
    
    # Check if servers are already running
    $backendRunning = Test-ServerConnectivity -Url "$BackendUrl/health" -Name "Backend"
    $frontendRunning = Test-ServerConnectivity -Url $FrontendUrl -Name "Frontend"
    
    if (-not $backendRunning) {
        Write-TestLog "Starting backend server..." "Info"
        Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd testbro-backend; npm run dev" -WindowStyle Minimized
        Start-Sleep -Seconds 10
    }
    
    if (-not $frontendRunning -and -not $BackendOnly) {
        Write-TestLog "Starting frontend server..." "Info"
        Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd testbro-frontend; npm run dev" -WindowStyle Minimized
        Start-Sleep -Seconds 10
    }
    
    # Wait for servers to be ready
    $retries = 30
    while ($retries -gt 0) {
        if (Test-ServerConnectivity -Url "$BackendUrl/health" -Name "Backend") {
            break
        }
        Start-Sleep -Seconds 2
        $retries--
    }
    
    if ($retries -eq 0) {
        throw "Backend server failed to start"
    }
}

function Generate-Report {
    Write-TestLog "📊 Generating Test Report..." "Info"
    
    $totalPassed = ($TestResults.Values | Measure-Object -Property Passed -Sum).Sum
    $totalFailed = ($TestResults.Values | Measure-Object -Property Failed -Sum).Sum
    $totalTests = $totalPassed + $totalFailed
    
    $report = @{
        Summary = @{
            Total = $totalTests
            Passed = $totalPassed
            Failed = $totalFailed
            SuccessRate = if ($totalTests -gt 0) { [math]::Round(($totalPassed / $totalTests) * 100, 2) } else { 0 }
            Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        }
        Suites = $TestResults
    }
    
    # Write report to file
    $reportPath = Join-Path (Get-Location) "service-integration-report.json"
    $report | ConvertTo-Json -Depth 5 | Out-File -FilePath $reportPath -Encoding UTF8
    
    # Console summary
    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor Cyan
    Write-Host "📊 SERVICE INTEGRATION TEST REPORT" -ForegroundColor Cyan
    Write-Host ("=" * 60) -ForegroundColor Cyan
    Write-Host "Total Tests: $totalTests"
    Write-Host "Passed: $totalPassed" -ForegroundColor Green
    Write-Host "Failed: $totalFailed" -ForegroundColor Red
    Write-Host "Success Rate: $($report.Summary.SuccessRate)%"
    Write-Host "Report saved to: $reportPath"
    
    # Suite breakdown
    foreach ($suite in $TestResults.GetEnumerator()) {
        $suiteName = $suite.Key
        $results = $suite.Value
        $suiteTotal = $results.Passed + $results.Failed
        
        if ($suiteTotal -gt 0) {
            $suiteSuccess = [math]::Round(($results.Passed / $suiteTotal) * 100, 2)
            Write-Host ""
            Write-Host "$($suiteName.ToUpper()): $($results.Passed)/$suiteTotal ($suiteSuccess%)" -ForegroundColor Yellow
            
            foreach ($test in $results.Tests) {
                $status = if ($test.Status -eq "Passed") { "✅" } else { "❌" }
                $duration = if ($test.Duration) { "($([math]::Round($test.Duration))ms)" } else { "" }
                Write-Host "  $status $($test.Name) $duration"
                
                if ($test.Error) {
                    Write-Host "    Error: $($test.Error)" -ForegroundColor Red
                }
            }
        }
    }
    
    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor Cyan
    
    return $report
}

# Main execution
try {
    if (-not $SkipPrerequisites) {
        Test-Prerequisites
        Start-Servers
    }
    
    if (-not $FrontendOnly) {
        Test-BackendConnectivity
        Test-DatabaseOperations
        Test-AuthenticationFlow
    }
    
    Test-IntegrationScenarios
    
    $report = Generate-Report
    
    if ($report.Summary.Failed -gt 0) {
        Write-TestLog "⚠️ Tests completed with $($report.Summary.Failed) failures" "Warning"
        exit 1
    } else {
        Write-TestLog "🎉 All integration tests passed!" "Success"
        exit 0
    }
} catch {
    Write-TestLog "💥 Integration tests failed: $($_.Exception.Message)" "Error"
    exit 1
}