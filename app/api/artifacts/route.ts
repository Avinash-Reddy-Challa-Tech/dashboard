import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { DateTime } from 'luxon';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromTimeParam = searchParams.get('fromTime');
    const toTimeParam = searchParams.get('toTime');
    
    if (!toTimeParam) {
      return NextResponse.json(
        { error: 'toTime parameter is required' },
        { status: 400 }
      );
    }

    // Parse time parameters
    const toTime = new Date(toTimeParam);
    const fromTime = fromTimeParam ? new Date(fromTimeParam) : null;
    
    if (isNaN(toTime.getTime())) {
      return NextResponse.json(
        { error: 'Invalid toTime format. Expected ISO 8601 format' },
        { status: 400 }
      );
    }
    
    if (fromTime && isNaN(fromTime.getTime())) {
      return NextResponse.json(
        { error: 'Invalid fromTime format. Expected ISO 8601 format' },
        { status: 400 }
      );
    }

    // Convert to timestamps for comparison
    const fromTs = fromTime ? Math.floor(fromTime.getTime() / 1000) : 0;
    const toTs = Math.floor(toTime.getTime() / 1000);

    // Connect to MongoDB
    const db = await getDatabase();
    
    // Debug: List all collections
    const collections = await db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    
    const collection = db.collection('artifacts');

    const results = [];

    // Debug logging
    console.log('Time filter parameters:', { fromTime, toTime, fromTs, toTs });
    console.log('MongoDB query parameters:', { fromTimeParam, toTimeParam });

    // First, let's check if the collection has any documents at all
    const totalCount = await collection.countDocuments({});
    console.log('Total documents in artifacts collection:', totalCount);
    
    // Check documents with created_at field
    const createdAtCount = await collection.countDocuments({ created_at: { $exists: true } });
    console.log('Documents with created_at field:', createdAtCount);
    
    // Check documents with non-null created_at
    const validCreatedAtCount = await collection.countDocuments({ 
      created_at: { $exists: true, $nin: [null, ""] } 
    });
    console.log('Documents with valid created_at field:', validCreatedAtCount);
    
    // Get a sample document to see the structure
    const sampleDoc = await collection.findOne({});
    if (sampleDoc) {
      console.log('Sample document structure:', {
        keys: Object.keys(sampleDoc),
        created_at: sampleDoc.created_at,
        createdAt: sampleDoc.createdAt,
        timestamp: sampleDoc.timestamp,
        date: sampleDoc.date
      });
    } else {
      console.log('No documents found in collection');
    }

    // Use MongoDB aggregation pipeline for proper date range filtering
    const pipeline = [
      // Stage 1: Match documents with valid created_at field
      {
        $match: {
          created_at: { $exists: true, $nin: [null, ""] }
        }
      },
      // Stage 2: Parse the created_at string and convert to proper date
      {
        $addFields: {
          parsed_date: {
            $dateFromString: {
              dateString: {
                $concat: [
                  "20", // Add "20" prefix for year
                  { $substr: [{ $substr: ["$created_at", 6, 2] }, 0, 2] }, // Extract year (YY)
                  "-",
                  { $substr: [{ $substr: ["$created_at", 3, 2] }, 0, 2] }, // Extract month (MM)
                  "-",
                  { $substr: ["$created_at", 0, 2] }, // Extract day (DD)
                  "T",
                  { $substr: [{ $substr: ["$created_at", 9, 8] }, 0, 8] }, // Extract time (HH:MM:SS)
                  "Z"
                ]
              },
              format: "%Y-%m-%dT%H:%M:%SZ",
              onError: null,
              onNull: null
            }
          }
        }
      },
      // Stage 3: Filter by date range using proper date comparison
      {
        $match: {
          parsed_date: {
            $ne: null,
            $gte: fromTime,
            $lte: toTime
          }
        }
      },
      // Stage 4: Sort by date descending
      {
        $sort: { parsed_date: -1 }
      },
      // Stage 5: Limit results
      {
        $limit: 1000
      }
    ];

    console.log('MongoDB aggregation pipeline:', JSON.stringify(pipeline, null, 2));

    const cursor = collection.aggregate(pipeline);
    
    let processedDocs = 0;

    for await (const doc of cursor) {
      processedDocs++;
      
      // Parse created_at for display formatting (filtering already done in aggregation)
      const created_at_str = doc.created_at || '';
      let date_str = null;
      let time_str = null;
      
      if (created_at_str) {
        try {
          const dt_obj = DateTime.fromFormat(created_at_str, "dd/MM/yy HH:mm:ss", { zone: 'utc' });
          if (dt_obj.isValid) {
            // Format for display
            date_str = dt_obj.toFormat('yyyy-MM-dd');
            time_str = dt_obj.toFormat('HH:mm:ss');
          }
        } catch (error) {
          console.error(`Error parsing date '${created_at_str}':`, error);
        }
      }
      
      // Extract nested data from artifactData
      const artifact_data = doc.artifactData || {};
      
      // Get user story type from userStorySnapshot
      let user_story_type = null;
      const user_story_snapshot = artifact_data.userStorySnapshot || [];
      if (user_story_snapshot && user_story_snapshot.length > 0) {
        user_story_type = user_story_snapshot[0].title || '';
      }
      
      // Get project name from selectedProjectSnapShot
      let project_name = null;
      const selected_project = artifact_data.selectedProjectSnapShot || {};
      if (selected_project) {
        project_name = selected_project.name || '';
      }
      
      // Build the result JSON object
      const result_json = {
        artifact_id: doc.artifactId || '',
        artifact_title: doc.artifactTitle || '',
        artifact_title_ids: doc.artifactTitleIDs || [],
        date: date_str,
        time: time_str,
        user_email: doc.userEmail || '',
        mode_name: doc.modeName || '',
        widget_name: doc.widgetName || '',
        project_name: project_name,
        user_story_type: user_story_type,
        status: "success",
        created_at: doc.created_at || '',
        updated_at: doc.updated_at || '',
      };
      
      results.push(result_json);
    }

    console.log(`Processing complete: Processed: ${processedDocs}, Results: ${results.length}`);
    return NextResponse.json(results);

  } catch (error) {
    console.error('Error in artifacts API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Optional: Add endpoint to get all artifacts without time filtering
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { limit = 100, skip = 0 } = body;

    // Connect to MongoDB
    const db = await getDatabase();
    const collection = db.collection('artifacts');

    const results = [];

    // Query with pagination
    const cursor = collection.find({}).skip(skip).limit(limit).sort({ created_at: -1 });

    for await (const doc of cursor) {
      const created_at_str = doc.created_at || '';
      
      let date_str = null;
      let time_str = null;
      
      if (created_at_str) {
        try {
          const dt_obj = DateTime.fromFormat(created_at_str, "dd/MM/yy HH:mm:ss", { zone: 'utc' });
          if (dt_obj.isValid) {
            date_str = dt_obj.toFormat('yyyy-MM-dd');
            time_str = dt_obj.toFormat('HH:mm:ss');
          }
        } catch (error) {
          console.error(`Error parsing date '${created_at_str}':`, error);
        }
      }
      
      const artifact_data = doc.artifactData || {};
      
      let user_story_type = null;
      const user_story_snapshot = artifact_data.userStorySnapshot || [];
      if (user_story_snapshot && user_story_snapshot.length > 0) {
        user_story_type = user_story_snapshot[0].title || '';
      }
      
      let project_name = null;
      const selected_project = artifact_data.selectedProjectSnapShot || {};
      if (selected_project) {
        project_name = selected_project.name || '';
      }
      
      const result_json = {
        artifact_id: doc.artifactId || '',
        artifact_title: doc.artifactTitle || '',
        artifact_title_ids: doc.artifactTitleIDs || [],
        date: date_str,
        time: time_str,
        user_email: doc.userEmail || '',
        mode_name: doc.modeName || '',
        widget_name: doc.widgetName || '',
        project_name: project_name,
        user_story_type: user_story_type,
        status: "success",
        created_at: doc.created_at || '',
        updated_at: doc.updated_at || '',
      };
      
      results.push(result_json);
    }

    // Get total count for pagination
    const totalCount = await collection.countDocuments({});

    return NextResponse.json({
      total: totalCount,
      skip: skip,
      limit: limit,
      data: results
    });

  } catch (error) {
    console.error('Error in artifacts POST route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
