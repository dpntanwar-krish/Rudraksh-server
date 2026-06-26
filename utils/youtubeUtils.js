/**
 * Validate YouTube URL
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://youtube.com/embed/VIDEO_ID
 */
const validateYoutubeUrl = (url) => {
  if (!url || typeof url !== "string") return false;

  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/i;
  return youtubeRegex.test(url);
};

/**
 * Extract Video ID from YouTube URL
 */
const extractVideoId = (url) => {
  if (!url) return null;

  // Handle youtu.be format: https://youtu.be/VIDEO_ID
  let match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|watch\?v=))([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];

  // Handle youtube.com/embed/ format
  match = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];

  // Handle youtube.com/watch?v= format with additional parameters
  match = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];

  return null;
};

/**
 * Generate YouTube thumbnail URL
 * Tries maxresdefault first, then fallback to hqdefault
 */
const generateThumbnailUrl = (videoId) => {
  if (!videoId) return null;

  // Primary: maxresdefault.jpg (high quality)
  // Fallback handled on frontend if 404
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
};

/**
 * Get embedded YouTube URL for iframe
 */
const getEmbedUrl = (videoId, params = {}) => {
  if (!videoId) return null;

  const defaultParams = {
    autoplay: params.autoplay || 0,
    modestbranding: params.modestbranding || 1,
    rel: params.rel || 0,
  };

  const queryString = new URLSearchParams(defaultParams).toString();
  return `https://www.youtube.com/embed/${videoId}?${queryString}`;
};

/**
 * Get thumbnail fallback options
 */
const getThumbnailOptions = (videoId) => {
  return {
    maxres: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    high: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    medium: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    default: `https://img.youtube.com/vi/${videoId}/default.jpg`,
  };
};

module.exports = {
  validateYoutubeUrl,
  extractVideoId,
  generateThumbnailUrl,
  getEmbedUrl,
  getThumbnailOptions,
};
