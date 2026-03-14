function outputStruct = extract_indices(cubePath, outputFolder)
%EXTRACT_INDICES Compute vegetation and soil indices and export GeoTIFF layers.

arguments
    cubePath (1, :) char
    outputFolder (1, :) char = fullfile('matlab', 'runtime', 'indices')
end

if ~isfile(cubePath)
    error('extract_indices:MissingCube', 'Cube file not found: %s', cubePath);
end
if ~isfolder(outputFolder)
    mkdir(outputFolder);
end

addpath(fullfile('matlab', 'utils'));
loaded = load(cubePath);
requiredFields = {'calibratedCube', 'wavelengths'};
for i = 1:numel(requiredFields)
    if ~isfield(loaded, requiredFields{i})
        error('extract_indices:InvalidCube', 'Missing field %s in cube MAT file.', requiredFields{i});
    end
end

cube = loaded.calibratedCube;
wavelengths = loaded.wavelengths;
reference = [];
if isfield(loaded, 'metadata') && isfield(loaded.metadata, 'SpatialRef')
    reference = loaded.metadata.SpatialRef;
end

red = bandAt(cube, wavelengths, 670);
nir = bandAt(cube, wavelengths, 800);
redEdge = bandAt(cube, wavelengths, 720);
blue = bandAt(cube, wavelengths, 470);
swir = bandAt(cube, wavelengths, 1610);
swir2 = bandAt(cube, wavelengths, 2200);

atmosphereCorrected = atmosphericCorrection(cube);
red = bandAt(atmosphereCorrected, wavelengths, 670);
nir = bandAt(atmosphereCorrected, wavelengths, 800);
redEdge = bandAt(atmosphereCorrected, wavelengths, 720);
blue = bandAt(atmosphereCorrected, wavelengths, 470);
swir = bandAt(atmosphereCorrected, wavelengths, 1610);
swir2 = bandAt(atmosphereCorrected, wavelengths, 2200);

ndvi = safeDivide(nir - red, nir + red);
ndre = safeDivide(nir - redEdge, nir + redEdge);
savi = 1.5 .* safeDivide(nir - red, nir + red + 0.5);
evi = 2.5 .* safeDivide(nir - red, nir + 6 .* red - 7.5 .* blue + 1);
smi = safeDivide(nir - swir, nir + swir);
clayMineralRatio = safeDivide(swir2, swir + eps('single'));
ironOxideIndex = safeDivide(red, blue + eps('single'));

indexMaps = struct('NDVI', ndvi, 'NDRE', ndre, 'SAVI', savi, 'EVI', evi, 'SMI', smi, ...
    'ClayMineralRatio', clayMineralRatio, 'IronOxideIndex', ironOxideIndex);
save(fullfile(outputFolder, 'index_maps.mat'), 'indexMaps', 'wavelengths', '-v7.3');

fields = fieldnames(indexMaps);
for i = 1:numel(fields)
    export_geotiff(fullfile(outputFolder, strcat(lower(fields{i}), '.tif')), indexMaps.(fields{i}), reference);
end

outputStruct = indexMaps;
end

function correctedCube = atmosphericCorrection(cube)
if exist('flaash', 'file') == 2
    correctedCube = flaash(cube);
else
    darkObject = prctile(cube, 1, [1 2]);
    correctedCube = cube - reshape(darkObject, 1, 1, []);
    correctedCube = max(correctedCube, 0);
end
end

function band = bandAt(cube, wavelengths, targetNm)
[~, idx] = min(abs(wavelengths - targetNm));
band = cube(:, :, idx);
end

function ratio = safeDivide(numerator, denominator)
ratio = numerator ./ max(denominator, eps('single'));
ratio(~isfinite(ratio)) = 0;
end
