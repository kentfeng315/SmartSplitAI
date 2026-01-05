import { Bill, Member } from '../types';

// Minified types for URL compression
type MinifiedMember = [string, string]; // [id, name]
type MinifiedBill = [string, string, number, string, string[], number]; // [id, title, amount, payerId, involvedIds, createdAt]
interface MinifiedData {
  m: MinifiedMember[];
  b: MinifiedBill[];
}

// Convert state to minified object to save URL space
const minify = (members: Member[], bills: Bill[]): MinifiedData => {
  return {
    m: members.map(m => [m.id, m.name]),
    b: bills.map(b => [b.id, b.title, b.amount, b.payerId, b.involvedIds, b.createdAt])
  };
};

// Restore state from minified object
const unminify = (data: MinifiedData): { members: Member[], bills: Bill[] } => {
  return {
    members: data.m.map(m => ({ id: m[0], name: m[1] })),
    bills: data.b.map(b => ({
      id: b[0],
      title: b[1],
      amount: b[2],
      payerId: b[3],
      involvedIds: b[4],
      createdAt: b[5]
    }))
  };
};

// Check if the current environment is local
export const isLocalEnvironment = (): boolean => {
  const { hostname, protocol } = window.location;
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    protocol === 'file:'
  );
};

export const generateSnapshotUrl = (members: Member[], bills: Bill[]): string => {
  try {
    const minified = minify(members, bills);
    const json = JSON.stringify(minified);
    // Base64 encode safe for URL
    const encoded = btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g,
      (match, p1) => String.fromCharCode(parseInt(p1, 16))
    ));
    
    // 1. Get current full URL
    let currentHref = window.location.href;
    
    // 2. Force remove 'blob:' prefix if it exists (common in preview environments)
    // RegExp handles cases like "blob:https://..." -> "https://..."
    if (currentHref.startsWith('blob:')) {
      currentHref = currentHref.replace(/^blob:/, '');
    }

    // 3. Construct URL object to manipulate params
    // If the stripped URL is invalid (e.g. just a path), we might need to fallback
    let urlObj: URL;
    try {
      urlObj = new URL(currentHref);
    } catch (e) {
      // If stripped URL is invalid, try to assume current origin if possible, otherwise fail gracefully
      if (window.location.origin && window.location.origin !== 'null') {
         urlObj = new URL(window.location.pathname, window.location.origin);
      } else {
         // Last resort: return just the encoded data if we can't build a domain URL
         console.warn("Could not determine base URL, returning raw data string");
         return `?data=${encoded}`; 
      }
    }

    // 4. Set the data param
    // Clear other params to keep it clean
    urlObj.search = ''; 
    urlObj.searchParams.set('data', encoded);
    
    return urlObj.toString();
  } catch (e) {
    console.error("Snapshot generation failed", e);
    return "";
  }
};

export const parseSnapshotData = (encoded: string): { members: Member[], bills: Bill[] } | null => {
  try {
    // Decode Base64
    const json = decodeURIComponent(atob(encoded).split('').map(c => 
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''));
    
    const data = JSON.parse(json) as MinifiedData;
    if (data && Array.isArray(data.m) && Array.isArray(data.b)) {
      return unminify(data);
    }
    return null;
  } catch (e) {
    console.error("Snapshot parsing failed", e);
    return null;
  }
};

// Attempt to shorten URL using TinyURL API via a CORS proxy
export const shortenUrl = async (longUrl: string): Promise<string> => {
  // If URL is extremely long, TinyURL might reject it.
  if (longUrl.length > 2500) {
    console.warn("URL too long for shortener, returning original.");
    return longUrl;
  }

  try {
    const tinyUrlApi = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`;
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(tinyUrlApi)}`;
    
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error('Shortener request failed');
    
    const shortUrl = await response.text();
    // Validate result is a URL
    if (shortUrl.startsWith('http')) {
      return shortUrl;
    }
    return longUrl;
  } catch (error) {
    console.warn("Shortener failed, falling back to long URL", error);
    return longUrl;
  }
};