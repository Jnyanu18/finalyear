import { FarmerProfile } from '../models/FarmerProfile.js';
import { z } from 'zod';

const FARM_SCHEME_STATUSES = ['not_applied', 'applied', 'pending', 'approved', 'rejected'];

const statusSchema = z.enum(FARM_SCHEME_STATUSES);

const profileInputSchema = z.object({
    personal: z.object({
        fullName: z.string().trim().max(120),
        mobile: z.string().trim().max(20),
        village: z.string().trim().max(120),
        district: z.string().trim().max(120),
        preferredLanguage: z.string().trim().max(40),
    }),
    land: z.object({
        plotId: z.string().trim().max(80),
        plotName: z.string().trim().max(120),
        landAreaAcres: z.number().min(0).max(100000).nullable(),
        irrigationType: z.string().trim().max(80),
        soilType: z.string().trim().max(80),
    }),
    season: z.object({
        cropName: z.string().trim().max(80),
        sowingDate: z.string().trim().max(20),
        expectedHarvestDate: z.string().trim().max(20),
        notes: z.string().trim().max(2000),
    }),
    schemes: z.object({
        pmKisanStatus: statusSchema,
        pmfbyStatus: statusSchema,
        enamStatus: statusSchema,
    }),
    alerts: z.object({
        harvestWindowReminder: z.boolean(),
        marketForecastReminder: z.boolean(),
    }),
    consent: z.object({
        shareAnalysisData: z.boolean(),
        shareMarketData: z.boolean(),
        allowAdvisorAccess: z.boolean(),
    }),
});

function normalizedProfile(profileDoc) {
    const p = profileDoc?.toObject ? profileDoc.toObject() : (profileDoc || {});

    const personal = {
        fullName: p?.personal?.fullName || p?.farmerName || '',
        mobile: p?.personal?.mobile || '',
        village: p?.personal?.village || p?.village || '',
        district: p?.personal?.district || p?.location || '',
        preferredLanguage: p?.personal?.preferredLanguage || 'en',
    };

    const land = {
        plotId: p?.land?.plotId || '',
        plotName: p?.land?.plotName || '',
        landAreaAcres: p?.land?.landAreaAcres ?? p?.landSize ?? null,
        irrigationType: p?.land?.irrigationType || p?.irrigationSource || '',
        soilType: p?.land?.soilType || p?.soilType || '',
    };

    const season = {
        cropName: p?.season?.cropName || p?.primaryCrop || 'Tomato',
        sowingDate: p?.season?.sowingDate || '',
        expectedHarvestDate: p?.season?.expectedHarvestDate || '',
        notes: p?.season?.notes || '',
    };

    const schemes = {
        pmKisanStatus: p?.schemes?.pmKisanStatus || 'not_applied',
        pmfbyStatus: p?.schemes?.pmfbyStatus || 'not_applied',
        enamStatus: p?.schemes?.enamStatus || 'not_applied',
    };

    const alerts = {
        harvestWindowReminder: p?.alerts?.harvestWindowReminder ?? true,
        marketForecastReminder: p?.alerts?.marketForecastReminder ?? true,
    };

    const consent = {
        shareAnalysisData: p?.consent?.shareAnalysisData ?? true,
        shareMarketData: p?.consent?.shareMarketData ?? true,
        allowAdvisorAccess: p?.consent?.allowAdvisorAccess ?? true,
        consentUpdatedAt: p?.consent?.consentUpdatedAt || null,
    };

    return {
        ...p,
        personal,
        land,
        season,
        schemes,
        alerts,
        consent,
        // legacy mirrors for older dashboards
        farmerName: personal.fullName,
        location: personal.district,
        village: personal.village,
        landSize: land.landAreaAcres ?? 0,
        soilType: land.soilType,
        primaryCrop: season.cropName,
        irrigationSource: land.irrigationType,
    };
}

// @desc    Get user's farmer profile
// @route   GET /api/profile
// @access  Private
export const getProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        let profile = await FarmerProfile.findOne({ userId });

        if (!profile) {
            profile = await FarmerProfile.create({ userId });
        }

        const responseProfile = normalizedProfile(profile);
        res.json({ profile: responseProfile });
    } catch (error) {
        console.error('Profile GET error:', error);
        res.status(500).json({ error: 'Failed to load profile.' });
    }
};

// @desc    Update user's farmer profile
// @route   PUT /api/profile
// @access  Private
export const updateProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        const parsed = profileInputSchema.safeParse(req.body);

        if (!parsed.success) {
            return res.status(400).json({ error: 'Invalid profile payload.' });
        }

        const data = parsed.data;
        let existing = await FarmerProfile.findOne({ userId });

        if (!existing) {
            existing = await FarmerProfile.create({ userId });
        }

        const now = new Date();
        const consentChanged =
            existing.consent.shareAnalysisData !== data.consent.shareAnalysisData ||
            existing.consent.shareMarketData !== data.consent.shareMarketData ||
            existing.consent.allowAdvisorAccess !== data.consent.allowAdvisorAccess;

        const consentUpdatedAt = consentChanged ? now : existing.consent.consentUpdatedAt;

        const updateDoc = {
            personal: data.personal,
            land: data.land,
            season: data.season,
            schemes: data.schemes,
            alerts: data.alerts,
            consent: {
                ...data.consent,
                consentUpdatedAt,
            },
            // legacy mirrors
            farmerName: data.personal.fullName,
            location: data.personal.district,
            village: data.personal.village,
            landSize: data.land.landAreaAcres ?? 0,
            soilType: data.land.soilType,
            primaryCrop: data.season.cropName,
            irrigationSource: data.land.irrigationType,
        };

        const updatedProfile = await FarmerProfile.findOneAndUpdate(
            { userId },
            { $set: updateDoc },
            { new: true, upsert: true }
        );

        res.json({ profile: normalizedProfile(updatedProfile) });
    } catch (error) {
        console.error('Profile PUT error:', error);
        res.status(500).json({ error: 'Failed to save profile.' });
    }
};
