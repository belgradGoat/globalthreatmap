import { Valyu } from "valyu-js";

let valyuInstance: Valyu | null = null;

function getValyuClient(): Valyu {
  if (!valyuInstance) {
    const apiKey = process.env.VALYU_API_KEY;
    if (!apiKey) {
      throw new Error("VALYU_API_KEY environment variable is not set");
    }
    valyuInstance = new Valyu(apiKey);
  }
  return valyuInstance;
}

function parsePublishedDate(dateValue: unknown): string | undefined {
  if (!dateValue) return undefined;

  // Handle string dates
  if (typeof dateValue === "string") {
    const parsed = new Date(dateValue);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  // Handle Date objects
  if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
    return dateValue.toISOString();
  }

  // Handle Unix timestamps (seconds or milliseconds)
  if (typeof dateValue === "number") {
    const timestamp = dateValue > 1e12 ? dateValue : dateValue * 1000;
    const parsed = new Date(timestamp);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return undefined;
}

export async function searchEvents(
  query: string,
  options?: {
    maxResults?: number;
    freshness?: "day" | "week" | "month";
  }
) {
  try {
    const valyu = getValyuClient();
    const response = await valyu.search(query, {
      searchType: "all",
      maxNumResults: options?.maxResults || 20,
    });

    if (!response.results) {
      return [];
    }

    return response.results.map((result) => {
      // Valyu returns both 'date' and 'publication_date' fields
      const dateValue = result.date || result.publication_date;

      return {
        title: result.title || "Untitled",
        url: result.url || "",
        content: typeof result.content === "string" ? result.content : "",
        publishedDate: parsePublishedDate(dateValue),
        source: result.source,
      };
    });
  } catch (error) {
    console.error("Valyu search error:", error);
    throw error;
  }
}

export async function getEntityResearch(entityName: string) {
  try {
    const valyu = getValyuClient();
    const response = await valyu.search(
      `${entityName} organization profile background`,
      {
        searchType: "all",
        maxNumResults: 10,
      }
    );

    if (!response.results || response.results.length === 0) {
      return null;
    }

    const combinedContent = response.results
      .map((r) => (typeof r.content === "string" ? r.content : ""))
      .join("\n\n");

    return {
      name: entityName,
      description: combinedContent.slice(0, 1000),
      type: "organization",
      data: {
        sources: response.results.map((r) => ({
          title: r.title,
          url: r.url,
        })),
      },
    };
  } catch (error) {
    console.error("Valyu entity research error:", error);
    throw error;
  }
}

export async function searchEntityLocations(entityName: string) {
  try {
    const valyu = getValyuClient();
    const response = await valyu.search(
      `${entityName} headquarters offices locations branches worldwide operations`,
      {
        searchType: "all",
        maxNumResults: 15,
      }
    );

    if (!response.results || response.results.length === 0) {
      return [];
    }

    const combinedContent = response.results
      .map((r) => (typeof r.content === "string" ? r.content : ""))
      .join("\n\n");

    return combinedContent;
  } catch (error) {
    console.error("Valyu entity locations error:", error);
    return "";
  }
}

export async function deepResearch(
  topic: string
): Promise<{ summary: string; sources: { title: string; url: string }[] }> {
  try {
    const valyu = getValyuClient();
    const response = await valyu.search(`comprehensive analysis: ${topic}`, {
      searchType: "all",
      maxNumResults: 30,
    });

    if (!response.results) {
      return { summary: "No research results found.", sources: [] };
    }

    const summary = response.results
      .slice(0, 10)
      .map((r) => (typeof r.content === "string" ? r.content : ""))
      .join("\n\n")
      .slice(0, 3000);

    const sources = response.results.map((r) => ({
      title: r.title || "Untitled",
      url: r.url || "",
    }));

    return { summary, sources };
  } catch (error) {
    console.error("Valyu deep research error:", error);
    throw error;
  }
}

interface ConflictResult {
  answer: string;
  sources: { title: string; url: string }[];
}

export interface MilitaryBase {
  country: string;
  baseName: string;
  latitude: number;
  longitude: number;
  type: "usa" | "nato";
}

export async function getMilitaryBases(): Promise<MilitaryBase[]> {
  const valyu = getValyuClient();

  type AnswerResponse = {
    contents?: string;
    search_results?: Array<{ title?: string; url?: string }>;
  };

  const response = await valyu.answer(
    `List all countries that currently host US military bases or NATO military installations. For each country, provide the name of the main/largest base and whether it's a US base or NATO base. Format each entry as: Country | Base Name | Type (US or NATO)`,
    {
      excludedSources: ["wikipedia.org"],
    }
  );

  const answerData = response as AnswerResponse;
  const content = answerData.contents || "";

  // Parse the response to extract base information
  const bases: MilitaryBase[] = [];
  const lines = content.split("\n");

  // Known coordinates for countries with military bases (fallback)
  const countryCoordinates: Record<string, { lat: number; lng: number }> = {
    "Germany": { lat: 50.1109, lng: 8.6821 },
    "Japan": { lat: 35.6762, lng: 139.6503 },
    "South Korea": { lat: 37.5665, lng: 126.9780 },
    "Italy": { lat: 41.9028, lng: 12.4964 },
    "United Kingdom": { lat: 51.5074, lng: -0.1278 },
    "Turkey": { lat: 39.9334, lng: 32.8597 },
    "Spain": { lat: 40.4168, lng: -3.7038 },
    "Poland": { lat: 52.2297, lng: 21.0122 },
    "Romania": { lat: 44.4268, lng: 26.1025 },
    "Bulgaria": { lat: 42.6977, lng: 23.3219 },
    "Greece": { lat: 37.9838, lng: 23.7275 },
    "Belgium": { lat: 50.8503, lng: 4.3517 },
    "Netherlands": { lat: 52.3676, lng: 4.9041 },
    "Portugal": { lat: 38.7223, lng: -9.1393 },
    "Norway": { lat: 59.9139, lng: 10.7522 },
    "Denmark": { lat: 55.6761, lng: 12.5683 },
    "Estonia": { lat: 59.4370, lng: 24.7536 },
    "Latvia": { lat: 56.9496, lng: 24.1052 },
    "Lithuania": { lat: 54.6872, lng: 25.2797 },
    "Czech Republic": { lat: 50.0755, lng: 14.4378 },
    "Hungary": { lat: 47.4979, lng: 19.0402 },
    "Slovakia": { lat: 48.1486, lng: 17.1077 },
    "Slovenia": { lat: 46.0569, lng: 14.5058 },
    "Croatia": { lat: 45.8150, lng: 15.9819 },
    "Albania": { lat: 41.3275, lng: 19.8187 },
    "Montenegro": { lat: 42.4304, lng: 19.2594 },
    "North Macedonia": { lat: 41.9981, lng: 21.4254 },
    "Qatar": { lat: 25.2854, lng: 51.5310 },
    "Bahrain": { lat: 26.0667, lng: 50.5577 },
    "Kuwait": { lat: 29.3759, lng: 47.9774 },
    "United Arab Emirates": { lat: 24.4539, lng: 54.3773 },
    "Saudi Arabia": { lat: 24.7136, lng: 46.6753 },
    "Djibouti": { lat: 11.5721, lng: 43.1456 },
    "Australia": { lat: -25.2744, lng: 133.7751 },
    "Singapore": { lat: 1.3521, lng: 103.8198 },
    "Philippines": { lat: 14.5995, lng: 120.9842 },
    "Guam": { lat: 13.4443, lng: 144.7937 },
    "Diego Garcia": { lat: -7.3195, lng: 72.4229 },
    "Honduras": { lat: 14.0723, lng: -87.1921 },
    "Cuba": { lat: 19.9030, lng: -75.0997 }, // Guantanamo
    "Kosovo": { lat: 42.6026, lng: 20.9030 },
    "Iraq": { lat: 33.3152, lng: 44.3661 },
    "Syria": { lat: 35.2433, lng: 38.9637 },
    "Afghanistan": { lat: 34.5553, lng: 69.2075 },
    "Iceland": { lat: 64.1466, lng: -21.9426 },
    "Greenland": { lat: 76.5310, lng: -68.7030 }, // Thule
  };

  // Parse response and create base entries
  for (const line of lines) {
    const parts = line.split("|").map((p) => p.trim());
    if (parts.length >= 2) {
      const countryName = parts[0].replace(/^[-*•\d.)\s]+/, "").trim();
      const baseName = parts[1] || "Military Base";
      const typeStr = (parts[2] || "").toLowerCase();
      const type: "usa" | "nato" = typeStr.includes("nato") ? "nato" : "usa";

      const coords = countryCoordinates[countryName];
      if (coords) {
        bases.push({
          country: countryName,
          baseName,
          latitude: coords.lat,
          longitude: coords.lng,
          type,
        });
      }
    }
  }

  // If parsing didn't work well, return default known bases
  if (bases.length < 5) {
    return [
      { country: "Germany", baseName: "Ramstein Air Base", latitude: 49.4369, longitude: 7.6003, type: "usa" },
      { country: "Japan", baseName: "Yokota Air Base", latitude: 35.7485, longitude: 139.3487, type: "usa" },
      { country: "South Korea", baseName: "Camp Humphreys", latitude: 36.9631, longitude: 127.0311, type: "usa" },
      { country: "Italy", baseName: "Aviano Air Base", latitude: 46.0319, longitude: 12.5965, type: "nato" },
      { country: "United Kingdom", baseName: "RAF Lakenheath", latitude: 52.4093, longitude: 0.5610, type: "usa" },
      { country: "Turkey", baseName: "Incirlik Air Base", latitude: 37.0017, longitude: 35.4259, type: "nato" },
      { country: "Spain", baseName: "Rota Naval Station", latitude: 36.6453, longitude: -6.3497, type: "usa" },
      { country: "Poland", baseName: "Redzikowo", latitude: 54.4791, longitude: 17.0975, type: "nato" },
      { country: "Romania", baseName: "Mihail Kogălniceanu", latitude: 44.3622, longitude: 28.4883, type: "nato" },
      { country: "Greece", baseName: "Souda Bay", latitude: 35.5317, longitude: 24.1217, type: "nato" },
      { country: "Qatar", baseName: "Al Udeid Air Base", latitude: 25.1173, longitude: 51.3150, type: "usa" },
      { country: "Bahrain", baseName: "NSA Bahrain", latitude: 26.2361, longitude: 50.6508, type: "usa" },
      { country: "Kuwait", baseName: "Camp Arifjan", latitude: 28.9347, longitude: 48.0917, type: "usa" },
      { country: "United Arab Emirates", baseName: "Al Dhafra Air Base", latitude: 24.2481, longitude: 54.5467, type: "usa" },
      { country: "Djibouti", baseName: "Camp Lemonnier", latitude: 11.5469, longitude: 43.1556, type: "usa" },
      { country: "Australia", baseName: "Pine Gap", latitude: -23.7990, longitude: 133.7370, type: "usa" },
      { country: "Singapore", baseName: "Sembawang", latitude: 1.4419, longitude: 103.8200, type: "usa" },
      { country: "Guam", baseName: "Andersen Air Force Base", latitude: 13.5839, longitude: 144.9244, type: "usa" },
      { country: "Diego Garcia", baseName: "Naval Support Facility", latitude: -7.3133, longitude: 72.4111, type: "usa" },
      { country: "Cuba", baseName: "Guantanamo Bay", latitude: 19.9025, longitude: -75.0969, type: "usa" },
      { country: "Kosovo", baseName: "Camp Bondsteel", latitude: 42.3600, longitude: 21.2500, type: "nato" },
      { country: "Belgium", baseName: "NATO HQ Brussels", latitude: 50.8770, longitude: 4.4260, type: "nato" },
      { country: "Netherlands", baseName: "Brunssum", latitude: 50.9469, longitude: 5.9772, type: "nato" },
      { country: "Norway", baseName: "Rygge Air Station", latitude: 59.3783, longitude: 10.7850, type: "nato" },
      { country: "Estonia", baseName: "Ämari Air Base", latitude: 59.2603, longitude: 24.2086, type: "nato" },
      { country: "Latvia", baseName: "Lielvārde Air Base", latitude: 56.7761, longitude: 24.8536, type: "nato" },
      { country: "Lithuania", baseName: "Šiauliai Air Base", latitude: 55.8939, longitude: 23.3950, type: "nato" },
      { country: "Iceland", baseName: "Keflavik", latitude: 63.9850, longitude: -22.6056, type: "nato" },
      { country: "Greenland", baseName: "Thule Air Base", latitude: 76.5312, longitude: -68.7031, type: "usa" },
      { country: "Honduras", baseName: "Soto Cano Air Base", latitude: 14.3822, longitude: -87.6211, type: "usa" },
      { country: "Philippines", baseName: "Clark Air Base", latitude: 15.1858, longitude: 120.5600, type: "usa" },
      { country: "Bulgaria", baseName: "Novo Selo", latitude: 42.0167, longitude: 26.1333, type: "nato" },
    ];
  }

  return bases;
}

export async function getCountryConflicts(
  country: string
): Promise<{ past: ConflictResult; current: ConflictResult }> {
  const valyu = getValyuClient();

  // Type for Valyu answer response
  type AnswerResponse = {
    contents?: string;
    search_results?: Array<{ title?: string; url?: string }>;
  };

  // Fetch both past and current conflicts in parallel
  const [pastResponse, currentResponse] = await Promise.all([
    valyu.answer(
      `List all major historical wars, conflicts, and military engagements that ${country} has been involved in throughout history (excluding any ongoing conflicts). Include the dates, opposing parties, and brief outcomes for each conflict. Focus on conflicts that have ended.`,
      {
        excludedSources: ["wikipedia.org"],
      }
    ),
    valyu.answer(
      `List all current, ongoing, or brewing conflicts, wars, military tensions, and security threats involving ${country} as of 2024-2026. Include active military operations, border disputes, civil unrest, terrorism threats, and geopolitical tensions. If there are no current conflicts, state that clearly.`,
      {
        excludedSources: ["wikipedia.org"],
      }
    ),
  ]);

  const pastData = pastResponse as AnswerResponse;
  const currentData = currentResponse as AnswerResponse;

  return {
    past: {
      answer: pastData.contents || "No historical conflict information found.",
      sources: (pastData.search_results || []).map((s) => ({
        title: s.title || "Source",
        url: s.url || "",
      })),
    },
    current: {
      answer: currentData.contents || "No current conflict information found.",
      sources: (currentData.search_results || []).map((s) => ({
        title: s.title || "Source",
        url: s.url || "",
      })),
    },
  };
}

export type ConflictStreamChunk = {
  type: "current_content" | "current_sources" | "past_content" | "past_sources" | "done" | "error";
  content?: string;
  sources?: Array<{ title: string; url: string }>;
  error?: string;
};

export async function* streamCountryConflicts(
  country: string
): AsyncGenerator<ConflictStreamChunk> {
  const valyu = getValyuClient();

  const currentQuery = `List all current, ongoing, or brewing conflicts, wars, military tensions, and security threats involving ${country} as of 2024-2026. Include active military operations, border disputes, civil unrest, terrorism threats, and geopolitical tensions. If there are no current conflicts, state that clearly.`;

  const pastQuery = `List all major historical wars, conflicts, and military engagements that ${country} has been involved in throughout history (excluding any ongoing conflicts). Include the dates, opposing parties, and brief outcomes for each conflict. Focus on conflicts that have ended.`;

  try {
    // Stream current conflicts first
    const currentStream = await valyu.answer(currentQuery, {
      excludedSources: ["wikipedia.org"],
      streaming: true,
    });

    if (Symbol.asyncIterator in (currentStream as object)) {
      for await (const chunk of currentStream as AsyncGenerator<{
        type: string;
        content?: string;
        search_results?: Array<{ title?: string; url?: string }>;
      }>) {
        if (chunk.type === "content" && chunk.content) {
          yield { type: "current_content", content: chunk.content };
        } else if (chunk.type === "search_results" && chunk.search_results) {
          yield {
            type: "current_sources",
            sources: chunk.search_results.map((s) => ({
              title: s.title || "Source",
              url: s.url || "",
            })),
          };
        }
      }
    }

    // Then stream past conflicts
    const pastStream = await valyu.answer(pastQuery, {
      excludedSources: ["wikipedia.org"],
      streaming: true,
    });

    if (Symbol.asyncIterator in (pastStream as object)) {
      for await (const chunk of pastStream as AsyncGenerator<{
        type: string;
        content?: string;
        search_results?: Array<{ title?: string; url?: string }>;
      }>) {
        if (chunk.type === "content" && chunk.content) {
          yield { type: "past_content", content: chunk.content };
        } else if (chunk.type === "search_results" && chunk.search_results) {
          yield {
            type: "past_sources",
            sources: chunk.search_results.map((s) => ({
              title: s.title || "Source",
              url: s.url || "",
            })),
          };
        }
      }
    }

    yield { type: "done" };
  } catch (error) {
    yield {
      type: "error",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
