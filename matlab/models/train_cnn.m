function trainedNet = train_cnn(trainingFolder, outputPath)
%TRAIN_CNN Train a hyperspectral CNN using a ResNet-18 backbone.

arguments
    trainingFolder (1, :) char
    outputPath (1, :) char = fullfile('matlab', 'runtime', 'cnn_model.mat')
end

imds = imageDatastore(trainingFolder, 'IncludeSubfolders', true, 'LabelSource', 'foldernames');
numClasses = numel(categories(imds.Labels));
augimds = augmentedImageDatastore([64 64], imds, 'DataAugmentation', imageDataAugmenter(...
    'RandXReflection', true, 'RandRotation', [-20 20], 'RandYReflection', true));

baseNet = resnet18;
lgraph = layerGraph(baseNet);
lgraph = replaceLayer(lgraph, 'fc1000', fullyConnectedLayer(numClasses, 'Name', 'agrosense_fc'));
lgraph = replaceLayer(lgraph, 'ClassificationLayer_predictions', classificationLayer('Name', 'agrosense_output'));

options = trainingOptions('adam', ...
    'InitialLearnRate', 1e-4, ...
    'MaxEpochs', 12, ...
    'MiniBatchSize', 16, ...
    'Shuffle', 'every-epoch', ...
    'ValidationFrequency', 20, ...
    'Verbose', false, ...
    'Plots', 'none');

trainedNet = trainNetwork(augimds, lgraph, options);
save(outputPath, 'trainedNet');
end
