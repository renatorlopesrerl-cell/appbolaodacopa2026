// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import admin from "npm:firebase-admin@11.11.1";

// Initialize Firebase Admin SDK
const initFirebase = () => {
    if (admin.apps.length === 0) {
        const clientEmail = Deno.env.get("FCM_CLIENT_EMAIL");
        const privateKey = Deno.env.get("FCM_PRIVATE_KEY")?.replace(/\\n/g, "\n");
        const projectId = Deno.env.get("FCM_PROJECT_ID") || "batepapobase";

        if (!clientEmail || !privateKey) {
            throw new Error("FCM_CLIENT_EMAIL and FCM_PRIVATE_KEY are required");
        }

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey,
            }),
        });
    }
};

serve(async (req) => {
    try {
        const { title, body, data, tokens, userIds } = await req.json();

        initFirebase();

        let targetTokens: string[] = [];

        // If tokens are explicitly provided (e.g. from Global Broadcast chunk)
        if (tokens && Array.isArray(tokens) && tokens.length > 0) {
            targetTokens = tokens;
        } 
        // If userIds are provided, fetch their tokens from Supabase
        else if (userIds && Array.isArray(userIds) && userIds.length > 0) {
            const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
            const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
            const supabase = createClient(supabaseUrl, supabaseKey);

            const { data: tokenRows, error } = await supabase
                .from("user_fcm_tokens")
                .select("token")
                .in("user_id", userIds);

            if (error) {
                console.error("Supabase error fetching tokens:", error);
            } else if (tokenRows) {
                targetTokens = tokenRows.map((r: any) => r.token).filter(Boolean);
            }
        }

        if (targetTokens.length === 0) {
            return new Response(
                JSON.stringify({ success: false, message: "No tokens found" }),
                { headers: { "Content-Type": "application/json" } }
            );
        }

        // Deduplicate tokens
        targetTokens = [...new Set(targetTokens)];

        // Firebase sendEachForMulticast accepts up to 500 tokens
        const CHUNK_SIZE = 500;
        let successCount = 0;
        let failureCount = 0;

        for (let i = 0; i < targetTokens.length; i += CHUNK_SIZE) {
            const chunk = targetTokens.slice(i, i + CHUNK_SIZE);
            
            const message = {
                notification: { title, body },
                data: data || {},
                android: { 
                    priority: "high" as const,
                    notification: {
                        channelId: "meu_canal"
                    }
                },
                apns: {
                    payload: {
                        aps: {
                            sound: "default",
                            badge: 1
                        }
                    }
                },
                webpush: {
                    headers: { Urgency: "high" },
                    notification: {
                        title,
                        body,
                        icon: "https://bolaodacopa2026.app/favicon.png"
                    }
                },
                tokens: chunk,
            };

            const response = await admin.messaging().sendEachForMulticast(message);
            successCount += response.successCount;
            failureCount += response.failureCount;

            // Log failures for debugging
            if (response.failureCount > 0) {
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        console.error(`Failed to send to token ${chunk[idx]}:`, resp.error);
                    }
                });
            }
        }

        return new Response(
            JSON.stringify({ 
                success: true, 
                message: `Successfully sent ${successCount} messages. Failed: ${failureCount}`
            }),
            { headers: { "Content-Type": "application/json" } }
        );

    } catch (error: any) {
        console.error("Error sending push:", error);
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
});
