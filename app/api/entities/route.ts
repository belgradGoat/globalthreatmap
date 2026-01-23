import { NextResponse } from "next/server";
import { getEntityResearch, deepResearch, searchEntityLocations } from "@/lib/valyu";

export const dynamic = "force-dynamic";
import { geocodeLocationsFromText } from "@/lib/geocoding";
import type { EntityProfile, GeoLocation } from "@/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  const deep = searchParams.get("deep") === "true";

  if (!name) {
    return NextResponse.json(
      { error: "Entity name is required" },
      { status: 400 }
    );
  }

  try {
    const entityData = await getEntityResearch(name);

    if (!entityData) {
      return NextResponse.json(
        { error: "Entity not found" },
        { status: 404 }
      );
    }

    const profile: EntityProfile = {
      id: `entity_${Date.now()}`,
      name: entityData.name,
      type: entityData.type as EntityProfile["type"],
      description: entityData.description,
      locations: [],
      relatedEntities: [],
      economicData: {},
    };

    if (deep) {
      const research = await deepResearch(name);
      profile.researchSummary = research.summary;
    }

    return NextResponse.json({ entity: profile });
  } catch (error) {
    console.error("Error researching entity:", error);
    return NextResponse.json(
      { error: "Failed to research entity" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, includeDeepResearch } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Entity name is required" },
        { status: 400 }
      );
    }

    const [entityData, locationContent] = await Promise.all([
      getEntityResearch(name),
      searchEntityLocations(name),
    ]);

    if (!entityData) {
      return NextResponse.json(
        { error: "Entity not found" },
        { status: 404 }
      );
    }

    // Extract and geocode locations from the search results
    const combinedText = `${entityData.description} ${locationContent}`;
    const locations = await geocodeLocationsFromText(combinedText, entityData.name);

    // Remove duplicates by placeName
    const uniqueLocations = locations.reduce((acc: GeoLocation[], loc) => {
      if (!acc.some(l => l.placeName === loc.placeName)) {
        acc.push(loc);
      }
      return acc;
    }, []);

    const profile: EntityProfile = {
      id: `entity_${Date.now()}`,
      name: entityData.name,
      type: entityData.type as EntityProfile["type"],
      description: entityData.description,
      locations: uniqueLocations,
      relatedEntities: [],
      economicData: entityData.data,
    };

    if (includeDeepResearch) {
      const research = await deepResearch(name);
      profile.researchSummary = research.summary;

      // Also extract locations from deep research
      const deepLocations = await geocodeLocationsFromText(research.summary);
      for (const loc of deepLocations) {
        if (!profile.locations?.some(l => l.placeName === loc.placeName)) {
          profile.locations?.push(loc);
        }
      }
    }

    return NextResponse.json({ entity: profile });
  } catch (error) {
    console.error("Error researching entity:", error);
    return NextResponse.json(
      { error: "Failed to research entity" },
      { status: 500 }
    );
  }
}
