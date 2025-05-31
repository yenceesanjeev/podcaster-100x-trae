import axios from 'axios';

interface LinkedInProfile {
  fullName?: string;
  headline?: string;
  summary?: string;
  occupation?: string;
  publicIdentifier?: string;
  profilePictureUrl?: string;
  backgroundPictureUrl?: string;
  experiences?: Array<{
    title?: string;
    companyName?: string;
    description?: string;
    dateRange?: string;
  }>;
  education?: Array<{
    schoolName?: string;
    degree?: string;
    dateRange?: string;
  }>;
  skills?: string[];
  posts?: Array<{
    text?: string;
    date?: string;
  }>;
}

interface PodcastBrief {
  guestName: string;
  guestTitle: string;
  guestProfileUrl: string;
  guestProfilePicture: string;
  introduction: string;
  questions: string[];
}

export async function fetchLinkedInProfile(profileUrl: string): Promise<LinkedInProfile> {
  try {
    const response = await axios.post(
      'https://api.apify.com/v2/acts/dev_fusion~linkedin-profile-scraper/run-sync-get-dataset-items',
      {
        profileUrls: [profileUrl]
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        params: {
          token: process.env.NEXT_PUBLIC_APIFY_API_KEY
        }
      }
    );
    if (response.data && response.data.length > 0) {
      return response.data[0];
    }
    
    throw new Error('Profile not found');
  } catch (error) {
    console.error('Error fetching LinkedIn profile:', error);
    throw new Error('Failed to fetch LinkedIn profile');
  }
}

export async function generatePodcastBrief(profile: LinkedInProfile, profileUrl: string): Promise<PodcastBrief> {
  try {
    // Prepare a prompt for OpenAI based on the LinkedIn profile
    const prompt = `
      Create a podcast introduction for a guest with the following LinkedIn profile information:
      
      Name: ${profile.fullName || 'Unknown'}
      Headline: ${profile.headline || 'Not provided'}
      Summary: ${profile.summary || 'Not provided'}
      
      Current Role: ${profile.experiences && profile.experiences[0] ? 
        `${profile.experiences[0].title} at ${profile.experiences[0].companyName}` : 'Not provided'}
      
      Experience: ${profile.experiences ? 
        profile.experiences.slice(0, 3).map(exp => 
          `${exp.title} at ${exp.companyName} (${exp.dateRange})`
        ).join(', ') : 'Not provided'}
      
      Education: ${profile.education ? 
        profile.education.slice(0, 2).map(edu => 
          `${edu.degree} from ${edu.schoolName}`
        ).join(', ') : 'Not provided'}
      
      Skills: ${profile.skills ? profile.skills.slice(0, 5).join(', ') : 'Not provided'}
      
      Write an engaging podcast introduction (300-350 characters) that builds excitement about this guest. Highlight their unique achievements, expertise, and what makes them fascinating. Use phrases like 'thrilled to have', 'incredibly accomplished', or 'pioneering work in'. End with an intriguing opening question. Format: Enthusiastic welcome + achievements + "[First Question]". Keep it dynamic and conversational.
    `;

    // Call OpenAI API
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4.1',
        messages: [
          {
            role: 'system',
            content: 'You are a professional podcast host who creates compelling introductions for guests.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`
        }
      }
    );

    const introduction = response.data.choices[0].message.content.trim();

    // Generate podcast questions
    const questionsPrompt = `You are an AI podcast host with access to the guest’s public LinkedIn profile, including their job history, education, skills, interests, and activity. Use this information to ask open-ended, thought-provoking questions tailored to their professional background. Your goal is to keep the conversation flowing naturally while surfacing unique insights, personal reflections, and even lightly controversial or contrarian takes.

Your instructions:
- Personalize everything: Start by identifying their most prominent roles, industries, transitions, or repeated themes across their career (e.g., "built multiple B2B SaaS startups", "moved from finance to AI", "ex-Google product manager turned VC").
- Ask 4 engaging follow-up questions that build on the guest's background.
- Questions should be thought-provoking and personal, not generic.
- Focus on their unique experiences, industry insights, and career journey.
- Keep questions concise but impactful.

Given the following LinkedIn profile data, generate 4 follow-up questions (the opening question will be in the intro). Output ONLY a JSON array of strings.

Profile Data:
Name: ${profile.fullName || 'Unknown'}
Headline: ${profile.headline || 'Not provided'}
Summary: ${profile.summary || 'Not provided'}
Current Role: ${profile.experiences && profile.experiences[0] ? `${profile.experiences[0].title} at ${profile.experiences[0].companyName}` : 'Not provided'}
Skills: ${profile.skills ? profile.skills.slice(0, 5).join(', ') : 'Not provided'}
`;

    const questionsResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4.1',
        messages: [
          {
            role: 'system',
            content: 'You are a professional podcast host who creates insightful questions for guests.'
          },
          {
            role: 'user',
            content: questionsPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 400
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`
        }
      }
    );

    let questions: string[] = [];
    try {
      // Try to parse JSON array from response
      questions = JSON.parse(questionsResponse.data.choices[0].message.content.trim());
      if (!Array.isArray(questions)) throw new Error('Not an array');
    } catch (e) {
      // Fallback: split by newlines or bullets
      questions = questionsResponse.data.choices[0].message.content.trim().split(/\n|\r|\d+\.\s|\-\s/).filter((q: string) => q.trim().length > 10);
    }

    return {
      guestName: profile.fullName || 'Guest',
      guestTitle: profile.headline || 'Professional',
      guestProfileUrl: profile.publicIdentifier ? `https://www.linkedin.com/in/${profile.publicIdentifier}` : profileUrl,
      guestProfilePicture: profile.profilePictureUrl || '',
      introduction,
      questions
    };
  } catch (error) {
    console.error('Error generating podcast brief:', error);
    throw new Error('Failed to generate podcast brief');
  }
}
