import { getFieldIndices, getFieldMap, listRegisteredFields } from "../services/agrosense/fieldService.js";
import { getModelStatus } from "../services/agrosense/modelService.js";

describe("AgroSense service layer", () => {
  test("lists seeded fields", async () => {
    const result = await listRegisteredFields();
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("overview.avgNdvi");
  });

  test("returns field map and indices for the first field", async () => {
    const fields = await listRegisteredFields();
    const fieldId = fields[0].id;
    const map = await getFieldMap(fieldId);
    const indices = await getFieldIndices(fieldId);

    expect(map.geojson.features.length).toBe(6);
    expect(indices.summary.avgNdvi).toBeGreaterThan(0);
  });

  test("returns active model metadata", async () => {
    const status = await getModelStatus();
    expect(status.models.length).toBe(4);
    expect(status.queue).toHaveProperty("mode");
  });
});
