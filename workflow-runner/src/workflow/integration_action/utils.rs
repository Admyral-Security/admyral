use crate::workflow::{context, reference_resolution::resolve_references};
use anyhow::{anyhow, Result};
use quickxml_to_serde::{xml_string_to_json, Config, JsonArray, JsonType};
use regex::Regex;
use std::collections::HashMap;

pub async fn get_parameter(
    parameter_name: &str,
    integration_name: &str,
    api_name: &str,
    parameters: &HashMap<String, String>,
    context: &context::Context,
) -> Result<serde_json::Value> {
    match parameters.get(parameter_name) {
        None => {
            tracing::error!(
                "Missing parameter \"{parameter_name}\" for {integration_name} {api_name}"
            );
            Err(anyhow!(
                "Missing parameter \"{parameter_name}\" for {integration_name} {api_name}"
            ))
        }
        Some(value) => Ok(resolve_references(value, context).await?.value),
    }
}

pub async fn get_string_parameter(
    parameter_name: &str,
    integration_name: &str,
    api_name: &str,
    parameters: &HashMap<String, String>,
    context: &context::Context,
) -> Result<String> {
    let result = get_parameter(
        parameter_name,
        integration_name,
        api_name,
        parameters,
        context,
    )
    .await?;

    match result.clone() {
        serde_json::Value::String(value) => Ok(value),
        _ => {
            tracing::error!("Invalid \"{parameter_name}\" parameter for {integration_name} {api_name} API because not a string: {:?}", result);
            return Err(anyhow!("Invalid \"{parameter_name}\" parameter for {integration_name} {api_name} API because not a string."));
        }
    }
}

pub fn xml_to_json(xml_content: String) -> Result<serde_json::Value> {
    let mut config = Config::new_with_defaults().add_json_type_override(
        Regex::new(r".*").unwrap(),
        JsonArray::Infer(JsonType::AlwaysString),
    );
    config.xml_text_node_prop_name = "text".to_string();
    xml_string_to_json(xml_content, &config).map_err(|e| anyhow!(e))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_xml_to_json() {
        let rss_feed_xml = r#"
        <?xml version="1.0" encoding="UTF-8"?>
        <rss version="2.0"
                xmlns:content="http://purl.org/rss/1.0/modules/content/"
                xmlns:wfw="http://wellformedweb.org/CommentAPI/"
                xmlns:dc="http://purl.org/dc/elements/1.1/"
                xmlns:atom="http://www.w3.org/2005/Atom"
                xmlns:sy="http://purl.org/rss/1.0/modules/syndication/"
                xmlns:slash="http://purl.org/rss/1.0/modules/slash/"
        >
                <channel>
                        <title>Threatpost</title>
                        <atom:link href="https://threatpost.com/feed/" rel="self" type="application/rss+xml" />
                        <link>https://threatpost.com</link>
                        <description>The First Stop For Security News</description>
                        <lastBuildDate>Wed, 31 Aug 2022 12:57:48 +0000</lastBuildDate>
                        <language>en-US</language>
                        <sy:updatePeriod>hourly</sy:updatePeriod>
                        <sy:updateFrequency>1</sy:updateFrequency>
                        <generator>https://wordpress.org/?v=6.5.2</generator>
                        <atom:link rel="hub" href="https://pubsubhubbub.appspot.com"/>
                        <atom:link rel="hub" href="https://pubsubhubbub.superfeedr.com"/>
                        <atom:link rel="hub" href="https://websubhub.com/hub"/>  
        
                        <item>
                                <title>Student Loan Breach Exposes 2.5M Records</title>
                                <link>https://threatpost.com/student-loan-breach-exposes-2-5m-records/180492/</link>
        
                                <dc:creator><![CDATA[Nate Nelson]]></dc:creator>
                                <pubDate>Wed, 31 Aug 2022 12:57:48 +0000</pubDate>
                                <category><![CDATA[Breach]]></category>
                                <guid isPermaLink="false">https://kasperskycontenthub.com/threatpost-global/?p=180492</guid>
        
                                <description><![CDATA[2.5 million people were affected, in a breach that could spell more trouble down the line.]]></description>
        
                                <media:content xmlns:media="http://search.yahoo.com/mrss/" url="https://media.kasperskycontenthub.com/wp-content/uploads/sites/103/2015/02/07005821/data.jpg" width="1600" height="1063">
                                        <media:keywords>full</media:keywords>
                                </media:content>
                                <media:content xmlns:media="http://search.yahoo.com/mrss/" url="https://media.kasperskycontenthub.com/wp-content/uploads/sites/103/2015/02/07005821/data-1024x680.jpg" width="1024" height="680">
                                        <media:keywords>large</media:keywords>
                                </media:content>
                                <media:content xmlns:media="http://search.yahoo.com/mrss/" url="https://media.kasperskycontenthub.com/wp-content/uploads/sites/103/2015/02/07005821/data-300x199.jpg" width="300" height="199">
                                        <media:keywords>medium</media:keywords>
                                </media:content>
                                <media:content xmlns:media="http://search.yahoo.com/mrss/" url="https://media.kasperskycontenthub.com/wp-content/uploads/sites/103/2015/02/07005821/data-150x150.jpg" width="150" height="150">
                                        <media:keywords>thumbnail</media:keywords>
                                </media:content>
                        </item>

                        <item>
                                <title>Watering Hole Attacks Push ScanBox Keylogger</title>
                                <link>https://threatpost.com/watering-hole-attacks-push-scanbox-keylogger/180490/</link>

                                <dc:creator><![CDATA[Nate Nelson]]></dc:creator>
                                <pubDate>Tue, 30 Aug 2022 16:00:43 +0000</pubDate>
                                <category><![CDATA[Malware]]></category>
                                <guid isPermaLink="false">https://kasperskycontenthub.com/threatpost-global/?p=180490</guid>

                                <description><![CDATA[Researchers uncover a watering hole attack likely carried out by APT TA423, which attempts to plant the ScanBox JavaScript-based reconnaissance tool.]]></description>

                                <media:content xmlns:media="http://search.yahoo.com/mrss/" url="https://media.kasperskycontenthub.com/wp-content/uploads/sites/103/2020/03/31170116/watering-hole-e1585688492540.jpg" width="800" height="600">
                                        <media:keywords>full</media:keywords>
                                </media:content>
                                <media:content xmlns:media="http://search.yahoo.com/mrss/" url="https://media.kasperskycontenthub.com/wp-content/uploads/sites/103/2020/03/31170116/watering-hole-e1585688492540.jpg" width="800" height="600">
                                        <media:keywords>large</media:keywords>
                                </media:content>
                                <media:content xmlns:media="http://search.yahoo.com/mrss/" url="https://media.kasperskycontenthub.com/wp-content/uploads/sites/103/2020/03/31170116/watering-hole-300x225.jpg" width="300" height="225">
                                        <media:keywords>medium</media:keywords>
                                </media:content>
                                <media:content xmlns:media="http://search.yahoo.com/mrss/" url="https://media.kasperskycontenthub.com/wp-content/uploads/sites/103/2020/03/31170116/watering-hole-150x150.jpg" width="150" height="150">
                                        <media:keywords>thumbnail</media:keywords>
                                </media:content>
                        </item>
                </channel>
        </rss>
        "#;

        let json_result = xml_to_json(rss_feed_xml.to_string());
        assert!(json_result.is_ok());

        let json = json_result.unwrap();

        let expected_json = json!({
            "rss": {
                "@version": "2.0",
                "channel": {
                    "title": "Threatpost",
                    "link": [
                        {
                            "@href": "https://threatpost.com/feed/",
                            "@rel": "self",
                            "@type": "application/rss+xml"
                        },
                        "https://threatpost.com",
                        {
                            "@rel": "hub",
                            "@href": "https://pubsubhubbub.appspot.com"
                        },
                        {
                            "@rel": "hub",
                            "@href": "https://pubsubhubbub.superfeedr.com"
                        },
                        {
                            "@rel": "hub",
                            "@href": "https://websubhub.com/hub"
                        }
                    ],
                    "description": "The First Stop For Security News",
                    "lastBuildDate": "Wed, 31 Aug 2022 12:57:48 +0000",
                    "language": "en-US",
                    "updatePeriod": "hourly",
                    "updateFrequency": "1",
                    "generator": "https://wordpress.org/?v=6.5.2",
                    "item": [
                        {
                            "title": "Student Loan Breach Exposes 2.5M Records",
                            "link": "https://threatpost.com/student-loan-breach-exposes-2-5m-records/180492/",
                            "creator": "Nate Nelson",
                            "pubDate": "Wed, 31 Aug 2022 12:57:48 +0000",
                            "category": "Breach",
                            "guid": {
                                "text": "https://kasperskycontenthub.com/threatpost-global/?p=180492",
                                "@isPermaLink": "false"
                            },
                            "description": "2.5 million people were affected, in a breach that could spell more trouble down the line.",
                            "content": [
                                {
                                    "@url": "https://media.kasperskycontenthub.com/wp-content/uploads/sites/103/2015/02/07005821/data.jpg",
                                    "@width": "1600",
                                    "@height": "1063",
                                    "keywords": "full"
                                },
                                {
                                    "@url": "https://media.kasperskycontenthub.com/wp-content/uploads/sites/103/2015/02/07005821/data-1024x680.jpg",
                                    "@width": "1024",
                                    "@height": "680",
                                    "keywords": "large"
                                },
                                {
                                    "@url": "https://media.kasperskycontenthub.com/wp-content/uploads/sites/103/2015/02/07005821/data-300x199.jpg",
                                    "@width": "300",
                                    "@height": "199",
                                    "keywords": "medium"
                                },
                                {
                                    "@url": "https://media.kasperskycontenthub.com/wp-content/uploads/sites/103/2015/02/07005821/data-150x150.jpg",
                                    "@width": "150",
                                    "@height": "150",
                                    "keywords": "thumbnail"
                                }
                            ]
                        },
                        {
                            "title": "Watering Hole Attacks Push ScanBox Keylogger",
                            "link": "https://threatpost.com/watering-hole-attacks-push-scanbox-keylogger/180490/",
                            "creator": "Nate Nelson",
                            "pubDate": "Tue, 30 Aug 2022 16:00:43 +0000",
                            "category": "Malware",
                            "guid": {
                                "text": "https://kasperskycontenthub.com/threatpost-global/?p=180490",
                                "@isPermaLink": "false"
                            },
                            "description": "Researchers uncover a watering hole attack likely carried out by APT TA423, which attempts to plant the ScanBox JavaScript-based reconnaissance tool.",
                            "content": [
                                {
                                    "@url": "https://media.kasperskycontenthub.com/wp-content/uploads/sites/103/2020/03/31170116/watering-hole-e1585688492540.jpg",
                                    "@width": "800",
                                    "@height": "600",
                                    "keywords": "full"
                                },
                                {
                                    "@url": "https://media.kasperskycontenthub.com/wp-content/uploads/sites/103/2020/03/31170116/watering-hole-e1585688492540.jpg",
                                    "@width": "800",
                                    "@height": "600",
                                    "keywords": "large"
                                },
                                {
                                    "@url": "https://media.kasperskycontenthub.com/wp-content/uploads/sites/103/2020/03/31170116/watering-hole-300x225.jpg",
                                    "@width": "300",
                                    "@height": "225",
                                    "keywords": "medium"
                                },
                                {
                                    "@url": "https://media.kasperskycontenthub.com/wp-content/uploads/sites/103/2020/03/31170116/watering-hole-150x150.jpg",
                                    "@width": "150",
                                    "@height": "150",
                                    "keywords": "thumbnail"
                                }
                            ]
                        }
                    ]
                }
            }
        });
        assert_eq!(expected_json, json);
    }
}
