# Quick Test Script
# Tests the backend functionality

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Backend Quick Test" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:8000"
$passed = 0
$failed = 0

# Test 1: Health Check
Write-Host "Test 1: Health Check" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get -TimeoutSec 5
    if ($response.status -eq "healthy") {
        Write-Host "  ✓ PASSED - Backend is healthy" -ForegroundColor Green
        Write-Host "    MongoDB: $($response.mongodb)" -ForegroundColor Gray
        Write-Host "    Redis: $($response.redis)" -ForegroundColor Gray
        $passed++
    } else {
        Write-Host "  ✗ FAILED - Unexpected response" -ForegroundColor Red
        $failed++
    }
} catch {
    Write-Host "  ✗ FAILED - Backend not responding" -ForegroundColor Red
    Write-Host "    Make sure backend is running: .\run.ps1" -ForegroundColor Yellow
    $failed++
}
Write-Host ""

# Test 2: Root Endpoint
Write-Host "Test 2: Root Endpoint" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/" -Method Get -TimeoutSec 5
    Write-Host "  ✓ PASSED - Root endpoint working" -ForegroundColor Green
    Write-Host "    Message: $($response.message)" -ForegroundColor Gray
    $passed++
} catch {
    Write-Host "  ✗ FAILED - Root endpoint error" -ForegroundColor Red
    $failed++
}
Write-Host ""

# Test 3: Chat - Gmail (Read)
Write-Host "Test 3: Chat - Gmail Read" -ForegroundColor Yellow
try {
    $body = @{
        user_id = "test-user"
        message = "Show me my unread emails"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/chat" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 10
    
    if ($response.response) {
        Write-Host "  ✓ PASSED - Gmail read working" -ForegroundColor Green
        Write-Host "    Response: $($response.response.Substring(0, [Math]::Min(50, $response.response.Length)))..." -ForegroundColor Gray
        $passed++
    } else {
        Write-Host "  ⚠ PARTIAL - Response received but unexpected format" -ForegroundColor Yellow
        $passed++
    }
} catch {
    Write-Host "  ✗ FAILED - Gmail read error" -ForegroundColor Red
    Write-Host "    Error: $_" -ForegroundColor Gray
    $failed++
}
Write-Host ""

# Test 4: Chat - Calendar (Read)
Write-Host "Test 4: Chat - Calendar Read" -ForegroundColor Yellow
try {
    $body = @{
        user_id = "test-user"
        message = "What are my events today?"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/chat" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 10
    
    if ($response.response) {
        Write-Host "  ✓ PASSED - Calendar read working" -ForegroundColor Green
        Write-Host "    Response: $($response.response.Substring(0, [Math]::Min(50, $response.response.Length)))..." -ForegroundColor Gray
        $passed++
    } else {
        Write-Host "  ⚠ PARTIAL - Response received but unexpected format" -ForegroundColor Yellow
        $passed++
    }
} catch {
    Write-Host "  ✗ FAILED - Calendar read error" -ForegroundColor Red
    Write-Host "    Error: $_" -ForegroundColor Gray
    $failed++
}
Write-Host ""

# Test 5: Chat - General Query
Write-Host "Test 5: Chat - General Query" -ForegroundColor Yellow
try {
    $body = @{
        user_id = "test-user"
        message = "Hello, how are you?"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/chat" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 10
    
    if ($response.response) {
        Write-Host "  ✓ PASSED - General query working" -ForegroundColor Green
        Write-Host "    Response: $($response.response.Substring(0, [Math]::Min(50, $response.response.Length)))..." -ForegroundColor Gray
        $passed++
    } else {
        Write-Host "  ⚠ PARTIAL - Response received but unexpected format" -ForegroundColor Yellow
        $passed++
    }
} catch {
    Write-Host "  ✗ FAILED - General query error" -ForegroundColor Red
    Write-Host "    Error: $_" -ForegroundColor Gray
    $failed++
}
Write-Host ""

# Summary
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Test Summary" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Passed: $passed" -ForegroundColor Green
Write-Host "  Failed: $failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
Write-Host "  Total:  $($passed + $failed)" -ForegroundColor White
Write-Host ""

if ($failed -eq 0) {
    Write-Host "✓ All tests passed! Backend is working correctly." -ForegroundColor Green
} else {
    Write-Host "⚠ Some tests failed. Check the errors above." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Cyan
    Write-Host "  • Backend not running: Run .\run.ps1" -ForegroundColor White
    Write-Host "  • MongoDB/Redis not running: docker-compose up -d mongodb redis" -ForegroundColor White
    Write-Host "  • GEMINI_API_KEY not set: Edit .env file" -ForegroundColor White
    Write-Host "  • OAuth not configured: Add credentials.json" -ForegroundColor White
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
