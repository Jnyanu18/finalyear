function outputPath = run_cnn_inference(modelPath, cubePath, zonePath, outputPath)
%RUN_CNN_INFERENCE Run zone-level CNN inference on hyperspectral patches.

arguments
    modelPath (1, :) char
    cubePath (1, :) char
    zonePath (1, :) char
    outputPath (1, :) char = fullfile('matlab', 'runtime', 'cnn_results.json')
end

loadedCube = load(cubePath);
loadedZones = load(zonePath);
if ~isfield(loadedCube, 'calibratedCube') || ~isfield(loadedZones, 'zoneMap')
    error('run_cnn_inference:InvalidInput', 'Expected calibratedCube and zoneMap inputs.');
end

cnn = load(modelPath);
if ~isfield(cnn, 'trainedNet')
    error('run_cnn_inference:MissingModel', 'The model MAT file must contain trainedNet.');
end

cube = loadedCube.calibratedCube;
zoneMap = loadedZones.zoneMap;
zoneIds = unique(zoneMap(:));
zoneIds(zoneIds == 0) = [];
classNames = ["Healthy", "Mild Stress", "Moderate Stress", "Severe Stress", "Disease", "Pest Damage"];
results = repmat(struct('zone_id', '', 'label', '', 'confidence', 0, 'distribution', []), numel(zoneIds), 1);

for i = 1:numel(zoneIds)
    mask = zoneMap == zoneIds(i);
    bbox = regionprops(mask, 'BoundingBox');
    if isempty(bbox)
        continue;
    end
    patch = extractPatch(cube, bbox(1).BoundingBox);
    if isa(cnn.trainedNet, 'SeriesNetwork') || isa(cnn.trainedNet, 'DAGNetwork')
        prediction = predict(cnn.trainedNet, patch);
    else
        prediction = predict(cnn.trainedNet, dlarray(single(patch), 'SSCB'));
    end
    prediction = gather(extractdata(prediction));
    [confidence, idx] = max(prediction(:));
    results(i).zone_id = sprintf('zone-%d', zoneIds(i));
    results(i).label = classNames(idx);
    results(i).confidence = confidence;
    results(i).distribution = prediction(:)';
end

fid = fopen(outputPath, 'w');
fprintf(fid, '%s', jsonencode(results));
fclose(fid);
end

function patch = extractPatch(cube, bbox)
rowStart = max(1, floor(bbox(2)));
colStart = max(1, floor(bbox(1)));
rowEnd = min(size(cube, 1), ceil(rowStart + bbox(4) - 1));
colEnd = min(size(cube, 2), ceil(colStart + bbox(3) - 1));
patch = cube(rowStart:rowEnd, colStart:colEnd, :);
patch = imresize(patch, [64 64]);
end
