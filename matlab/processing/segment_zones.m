function [zoneMap, labels] = segment_zones(indexPath, outputFolder)
%SEGMENT_ZONES Segment field condition zones using k-means and morphology.

arguments
    indexPath (1, :) char
    outputFolder (1, :) char = fullfile('matlab', 'runtime', 'zones')
end

if ~isfile(indexPath)
    error('segment_zones:MissingIndexFile', 'Index file not found: %s', indexPath);
end
if ~isfolder(outputFolder)
    mkdir(outputFolder);
end

loaded = load(indexPath);
if ~isfield(loaded, 'indexMaps')
    error('segment_zones:InvalidInput', 'Expected indexMaps in %s.', indexPath);
end

indexMaps = loaded.indexMaps;
featureStack = cat(3, indexMaps.NDVI, indexMaps.NDRE, indexMaps.SAVI, indexMaps.EVI, indexMaps.SMI);
[rows, cols, bands] = size(featureStack);
features = reshape(featureStack, rows * cols, bands);
features(isnan(features)) = 0;

clusterIds = kmeans(features, 6, 'Replicates', 5, 'MaxIter', 300, 'Distance', 'sqeuclidean');
zoneMap = reshape(clusterIds, rows, cols);
zoneMap = imopen(zoneMap, strel('disk', 2));
zoneMap = imclose(zoneMap, strel('disk', 3));

labels = struct(...
    '1', 'Healthy', ...
    '2', 'Mild', ...
    '3', 'Moderate', ...
    '4', 'Stressed', ...
    '5', 'Critical', ...
    '6', 'Bare/Water');

save(fullfile(outputFolder, 'zone_map.mat'), 'zoneMap', 'labels');
fid = fopen(fullfile(outputFolder, 'zone_labels.json'), 'w');
fprintf(fid, '%s', jsonencode(labels));
fclose(fid);
end
