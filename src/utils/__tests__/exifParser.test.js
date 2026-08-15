import { parseExifGPS, parseCoordinateComponent, applyRef, validateCoordinates } from '../exifParser.js';

function runTests() {
    let passed = 0;
    let failed = 0;

    function assert(condition, message) {
        if (condition) {
            console.log(`  ✅ PASS: ${message}`);
            passed++;
        } else {
            console.error(`  ❌ FAIL: ${message}`);
            failed++;
        }
    }

    console.log('\n========================================');
    console.log(' RUNNING EXIF GPS PARSER UNIT TESTS');
    console.log('========================================\n');

    // Test 1: Android Flat EXIF (Comma separated rationals)
    console.log('Test 1: Android Flat EXIF (Comma-separated rationals string)');
    const androidExif1 = {
        GPSLatitude: "19/1, 4/1, 3359/100",
        GPSLatitudeRef: "N",
        GPSLongitude: "72/1, 52/1, 3972/100",
        GPSLongitudeRef: "E",
    };
    const res1 = parseExifGPS(androidExif1);
    assert(res1 !== null, 'Extracted valid coordinates from Android flat EXIF');
    assert(res1 && Math.abs(res1.lat - 19.075997) < 0.001, `Latitude parsed correctly (~19.076): got ${res1?.lat}`);
    assert(res1 && Math.abs(res1.lng - 72.8777) < 0.001, `Longitude parsed correctly (~72.8777): got ${res1?.lng}`);

    // Test 2: Android Flat EXIF with S and W (Southern & Western hemispheres)
    console.log('\nTest 2: Southern & Western Hemisphere References (S/W)');
    const androidExifSW = {
        GPSLatitude: "33/1, 51/1, 5400/100",
        GPSLatitudeRef: "S",
        GPSLongitude: "151/1, 12/1, 2640/100",
        GPSLongitudeRef: "W",
    };
    const resSW = parseExifGPS(androidExifSW);
    assert(resSW !== null && resSW.lat < 0, `Latitude ref S produces negative latitude: ${resSW?.lat}`);
    assert(resSW !== null && resSW.lng < 0, `Longitude ref W produces negative longitude: ${resSW?.lng}`);

    // Test 3: Array of rational objects (Android/iOS EXIF library format)
    console.log('\nTest 3: Array of Rational Objects');
    const rationalArrayExif = {
        GPSLatitude: [{ numerator: 19, denominator: 1 }, { numerator: 4, denominator: 1 }, { numerator: 3359, denominator: 100 }],
        GPSLatitudeRef: "N",
        GPSLongitude: [{ numerator: 72, denominator: 1 }, { numerator: 52, denominator: 1 }, { numerator: 3972, denominator: 100 }],
        GPSLongitudeRef: "E",
    };
    const res3 = parseExifGPS(rationalArrayExif);
    assert(res3 !== null && Math.abs(res3.lat - 19.076) < 0.005, `Parsed array of rational objects correctly: lat=${res3?.lat}`);

    // Test 4: Array of numbers [D, M, S]
    console.log('\nTest 4: Array of Numbers [D, M, S]');
    const numericArrayExif = {
        GPSLatitude: [19, 4, 33.59],
        GPSLatitudeRef: "N",
        GPSLongitude: [72, 52, 39.72],
        GPSLongitudeRef: "E",
    };
    const res4 = parseExifGPS(numericArrayExif);
    assert(res4 !== null && Math.abs(res4.lat - 19.076) < 0.005, `Parsed numeric array correctly: lat=${res4?.lat}`);

    // Test 5: Formatted DMS strings ("19 deg 4' 33.59\" N")
    console.log('\nTest 5: Formatted DMS Strings');
    const dmsStringExif = {
        GPSLatitude: "19 deg 4' 33.59\" N",
        GPSLongitude: "72 deg 52' 39.72\" E",
    };
    const res5 = parseExifGPS(dmsStringExif);
    assert(res5 !== null && Math.abs(res5.lat - 19.076) < 0.005, `Parsed DMS formatted string correctly: lat=${res5?.lat}`);

    // Test 6: Direct Decimal Float Numbers / Strings
    console.log('\nTest 6: Direct Decimal Floats & Strings');
    const directFloatExif = {
        GPSLatitude: 19.0760,
        GPSLongitude: "72.8777",
        GPSLatitudeRef: "N",
        GPSLongitudeRef: "E",
    };
    const res6 = parseExifGPS(directFloatExif);
    assert(res6 !== null && res6.lat === 19.076 && res6.lng === 72.8777, `Parsed direct float & numeric string: lat=${res6?.lat}, lng=${res6?.lng}`);

    // Test 7: iOS Nested {GPS} Block
    console.log('\nTest 7: iOS Nested {GPS} Block');
    const iosExif = {
        '{GPS}': {
            Latitude: 19.076,
            LatitudeRef: 'N',
            Longitude: 72.8777,
            LongitudeRef: 'E',
        }
    };
    const res7 = parseExifGPS(iosExif);
    assert(res7 !== null && res7.lat === 19.076, `Parsed iOS {GPS} block correctly: lat=${res7?.lat}`);

    // Test 8: Malformed / Invalid / Null Island (0,0) -> MUST RETURN NULL (NEVER 0,0)
    console.log('\nTest 8: Malformed, Missing, and Null Island (0,0)');
    assert(parseExifGPS(null) === null, 'null EXIF returns null');
    assert(parseExifGPS({}) === null, 'empty EXIF returns null');
    assert(parseExifGPS({ GPSLatitude: 0, GPSLongitude: 0 }) === null, '0,0 (Null Island) returns null');
    assert(parseExifGPS({ GPSLatitude: 999, GPSLongitude: 72.8 }) === null, 'Out of bound latitude (>90) returns null');
    assert(parseExifGPS({ GPSLatitude: "invalid", GPSLongitude: "corrupt" }) === null, 'Corrupt string returns null');

    console.log('\n========================================');
    console.log(` TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================\n');

    if (failed > 0) {
        process.exit(1);
    }
}

runTests();
