import axios from 'axios';
import { getSearxngApiEndpoint } from '../config';

interface SearxngSearchOptions {
  categories?: string[];
  engines?: string[];
  language?: string;
  pageno?: number;
}

interface SearxngSearchResult {
  title: string;
  url: string;
  img_src?: string;
  thumbnail_src?: string;
  thumbnail?: string;
  content?: string;
  author?: string;
  iframe_src?: string;
}

export const searchSearxng = async (
  query: string,
  opts?: SearxngSearchOptions,
) => {
  try {
    const searxngURL = getSearxngApiEndpoint();
    console.log('SearxngURL', searxngURL);

    const url = new URL(`${searxngURL}/search?format=json`);
    url.searchParams.append('q', query);

    if (opts) {
      Object.entries(opts).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          url.searchParams.append(key, value.join(','));
        } else if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const res = await axios.get(url.toString());

    if (res.status !== 200) {
      throw new Error(`Error fetching data: ${res.statusText}`);
    }

    const results: SearxngSearchResult[] = res.data.results || [];
    const suggestions: string[] = res.data.suggestions || [];

    return { results, suggestions };
  } catch (error) {
    console.error('Error in searchSearxng:', error);
    return { results: [], suggestions: [] };
  }
};
