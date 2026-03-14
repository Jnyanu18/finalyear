function outputPath = ingest_hyperspectral(inputPath, outputPath)
%INGEST_HYPERSPECTRAL Load and radiometrically calibrate a hyperspectral cube.

arguments
    inputPath (1, :) char
    outputPath (1, :) char = fullfile('matlab', 'runtime', 'calibrated_cube.mat')
end

if ~isfile(inputPath)
    error('ingest_hyperspectral:MissingFile', 'Input file not found: %s', inputPath);
end

[outputFolder, ~, ~] = fileparts(outputPath);
if ~isempty(outputFolder) && ~isfolder(outputFolder)
    mkdir(outputFolder);
end

try
    cube = hypercube(inputPath);
    rawData = cube.DataCube;
    wavelengths = cube.Wavelength;
    metadata = cube.Metadata;
catch
    if endsWith(lower(inputPath), '.mat')
        loaded = load(inputPath);
        if ~isfield(loaded, 'cubeData')
            error('ingest_hyperspectral:InvalidMat', 'MAT file must contain cubeData.');
        end
        rawData = loaded.cubeData;
        wavelengths = loaded.wavelengths;
        metadata = struct();
    else
        error('ingest_hyperspectral:ReadError', 'Unable to read hyperspectral cube with hypercube().');
    end
end

if ndims(rawData) ~= 3
    error('ingest_hyperspectral:InvalidCube', 'Expected a 3-D hyperspectral datacube.');
end

rawData = single(rawData);
darkReference = prctile(rawData, 1, [1 2]);
whiteReference = prctile(rawData, 99, [1 2]);
scale = whiteReference - darkReference;
scale(scale == 0) = 1;
calibratedCube = (rawData - reshape(darkReference, 1, 1, [])) ./ reshape(scale, 1, 1, []);
calibratedCube = max(min(calibratedCube, 1), 0);

save(outputPath, 'calibratedCube', 'wavelengths', 'metadata', '-v7.3');
end
