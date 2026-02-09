#!/bin/bash

echo "=== INFRASTRUCTURE CLEANUP VERIFICATION ==="
echo ""

# Check function count
FUNCTION_COUNT=$(find api -type f -name "*.ts" | grep -v "lib/" | grep -v "services/" | wc -l | tr -d ' ')
echo "✓ Vercel Functions: $FUNCTION_COUNT/12"
if [ "$FUNCTION_COUNT" -le 12 ]; then
    echo "  Status: ✅ PASS (under limit)"
else
    echo "  Status: ❌ FAIL (over limit)"
fi
echo ""

# Check backend removal
if [ ! -d "backend" ]; then
    echo "✓ Backend directory: ✅ REMOVED"
else
    echo "✓ Backend directory: ❌ STILL EXISTS"
fi
echo ""

# Check workers removal
if [ ! -d "api/workers" ]; then
    echo "✓ Workers directory: ✅ REMOVED"
else
    echo "✓ Workers directory: ❌ STILL EXISTS"
fi
echo ""

# Check documentation
DOC_COUNT=$(ls -1 *.md 2>/dev/null | wc -l | tr -d ' ')
echo "✓ Documentation files: $DOC_COUNT"
ls -1 *.md 2>/dev/null | sed 's/^/  - /'
echo ""

# Check vercel.json
if grep -q '"destination": "/"' vercel.json; then
    echo "✓ vercel.json routing: ✅ FIXED"
else
    echo "✓ vercel.json routing: ❌ NEEDS FIX"
fi
echo ""

# List API routes
echo "✓ Final API Routes:"
find api -type f -name "*.ts" | grep -v "lib/" | grep -v "services/" | sort | nl | sed 's/^/  /'
echo ""

echo "=== SUMMARY ==="
if [ "$FUNCTION_COUNT" -le 12 ] && [ ! -d "backend" ] && [ ! -d "api/workers" ]; then
    echo "Status: ✅ ALL CHECKS PASSED"
    echo ""
    echo "Next step: Generate Supabase API Secret"
    echo "See: SUPABASE_API_SECRET.md"
else
    echo "Status: ⚠️  SOME CHECKS FAILED"
fi
