// All entry points use the same strict parser.
import core from './exifGpsCore';
export const { parseSingleValue, parseCoordinateComponent, applyRef, validateCoordinates, hasValidGpsValues, parseExifGPS, parseJpegBinaryExif } = core;
