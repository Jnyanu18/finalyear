import fs from 'fs';
import { globSync } from 'glob';

const files = globSync('server/src/agrinexus/**/controller.js');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    // Remove Next/Auth imports
    content = content.replace(/import { NextResponse } from ["']next\/server["'];\s*/g, '');
    content = content.replace(/import { getUserSession } from ["'].*?["'];.*?\n/g, '');
    content = content.replace(/import dbConnect.*?\s*/g, '');

    // Fix local service imports
    content = content.replace(/@\/lib\/services/g, '../../services');
    content = content.replace(/@\/lib\/utils_agrinexus/g, '../../../utils/agrinexus');
    content = content.replace(/yieldPredictionService/g, 'yieldPredictionService.js');
    content = content.replace(/diseaseForecastService/g, 'diseaseForecastService.js');
    content = content.replace(/irrigationPlannerService/g, 'irrigationPlannerService.js');
    content = content.replace(/harvestPlannerService/g, 'harvestPlannerService.js');
    content = content.replace(/storageAdvisorService/g, 'storageAdvisorService.js');
    content = content.replace(/marketRouterService/g, 'marketRouterService.js');
    content = content.replace(/profitSimulatorService/g, 'profitSimulatorService.js');

    // Change function signature
    content = content.replace(/export async function (POST|GET)\(req: Request\) {/g, 'export const handleRequest = async (req, res) => {');

    // Change user fetching 
    content = content.replace(/const user = await getUserSession\(\);[\s\S]*?return NextResponse.*?401.*?}/g, 'const user = req.user; // Set by protect middleware');

    // Fix JSON parsing
    content = content.replace(/const (.*?) = await req\.json\(\)\.catch\(\(\) => \({}\)\);/g, 'const $1 = req.body;');
    content = content.replace(/const (.*?) = await req\.json\(\);/g, 'const $1 = req.body;');

    // Fix Returns
    content = content.replace(/return NextResponse\.json\((.*?)\);/g, 'res.json($1);');
    content = content.replace(/return NextResponse\.json\((.*?), \{ status: (\d+) \}\);/g, 'res.status($2).json($1);');

    fs.writeFileSync(file, content);
    console.log('Processed', file);
});
