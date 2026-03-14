function fusionModel = train_fusion(trainingTablePath, outputPath)
%TRAIN_FUSION Train a gradient-boosted ensemble for pest risk classification.

arguments
    trainingTablePath (1, :) char
    outputPath (1, :) char = fullfile('matlab', 'runtime', 'fusion_model.mat')
end

if endsWith(lower(trainingTablePath), '.csv')
    data = readtable(trainingTablePath);
else
    loaded = load(trainingTablePath);
    data = loaded.trainingTable;
end

predictorNames = data.Properties.VariableNames(1:end-1);
responseName = data.Properties.VariableNames{end};
cv = cvpartition(data.(responseName), 'KFold', 5);
fusionModel = fitcensemble(data, responseName, ...
    'Method', 'LogitBoost', ...
    'Learners', templateTree('MaxNumSplits', 20), ...
    'CVPartition', cv, ...
    'PredictorNames', predictorNames);

save(outputPath, 'fusionModel');
end
