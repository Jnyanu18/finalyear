function export_geotiff(filename, rasterData, reference)
%EXPORT_GEOTIFF Export a raster layer using geospatial metadata when available.

arguments
    filename (1, :) char
    rasterData {mustBeNumeric}
    reference = []
end

[folderPath, ~, ~] = fileparts(filename);
if ~isempty(folderPath) && ~isfolder(folderPath)
    mkdir(folderPath);
end

try
    if ~isempty(reference)
        geotiffwrite(filename, rasterData, reference);
    else
        imwrite(mat2gray(rasterData), filename);
    end
catch geotiffError
    warning('export_geotiff:FallbackWrite', 'GeoTIFF export failed (%s). Writing PNG-compatible raster instead.', geotiffError.message);
    [fallbackFolder, fallbackName, ~] = fileparts(filename);
    fallbackPath = fullfile(fallbackFolder, strcat(fallbackName, '.png'));
    imwrite(mat2gray(rasterData), fallbackPath);
end
end
