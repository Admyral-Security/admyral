import LogoWithName from "@/components/icons/logo-with-name";
import { Flex, Heading, Text } from "@radix-ui/themes";
import Link from "next/link";

export default function TermsOfServicePage() {
	return (
		<Flex
			mt="4"
			p="4"
			direction="column"
			justify="center"
			align="center"
			gap="4"
			width="100%"
		>
			<Flex>
				<Link href="/">
					<LogoWithName />
				</Link>
			</Flex>

			<Flex direction="column" width="80%">
				<Heading>Terms of Service</Heading>
			</Flex>

			<Flex direction="column" width="80%">
				<Heading>1 Overview</Heading>

				<Text>
					This website is operated by Admyral Technologies GmbH.
					Throughout the site, the terms “we”, “us” and “our” refer to
					Admyral Technologies GmbH. Admyral Technologies GmbH offers
					this website, including all information, tools and services
					available from this site to you, the user, conditioned upon
					your acceptance of all terms, conditions, policies and
					notices stated here. By visiting our site and/ or purchasing
					something from us, you engage in our “Service” and agree to
					be bound by the following terms and conditions (“Terms of
					Service”, “Terms”), including those additional terms and
					conditions and policies referenced herein and/or available
					by hyperlink (including the data processing agreement at{" "}
					<Link href="/dpa">
						<u>admyral.dev/dpa</u>
					</Link>
					). These Terms of Service apply to all users of the site,
					including without limitation users who are browsers,
					vendors, customers, merchants, and/or contributors of
					content. Please read these Terms of Service carefully before
					accessing or using our website. By accessing or using any
					part of the site, you agree to be bound by these Terms of
					Service. If you do not agree to all the terms and conditions
					of this agreement, then you may not access the website or
					use any services. If these Terms of Service are considered
					an offer, acceptance is expressly limited to these Terms of
					Service. We reserve the right to update, change or replace
					any part of these Terms of Service by posting updates and/or
					changes to our website. It is your responsibility to check
					this page periodically for changes. Your continued use of or
					access to the website following the posting of any changes
					constitutes acceptance of those changes.
				</Text>
			</Flex>

			<Flex direction="column" width="80%">
				<Heading>2 General conditions</Heading>

				<Text>
					We reserve the right to refuse service to anyone for any
					reason at any time. You agree not to reproduce, duplicate,
					copy, sell, resell or exploit any portion of the Service,
					use of the Service, or access to the Service or any contact
					on the website through which the Service is provided,
					without express written permission by us. You agree that
					your use of and access to the Service, and any contact you
					have on the website through which the Service is provided,
					is strictly for legitimate, good faith commercial purposes
					and not for fraudulent, deceitful or competitive
					intelligence purposes. The headings used in this agreement
					are included for convenience only and will not limit or
					otherwise affect these Terms.
				</Text>
			</Flex>

			<Flex direction="column" width="80%">
				<Heading>
					3 Accuracy, completeness and timeliness of information
				</Heading>

				<Text>
					We are not responsible if information made available on this
					site is not accurate, complete or current. The material on
					this site is provided for general information only and
					should not be relied upon or used as the sole basis for
					making decisions without consulting primary, more accurate,
					more complete or more timely sources of information. Any
					reliance on the material on this site is at your own risk.
					This site may contain certain historical information.
					Historical information, necessarily, is not current and is
					provided for your reference only. We reserve the right to
					modify the contents of this site at any time, but we have no
					obligation to update any information on our site. You agree
					that it is your responsibility to monitor changes to our
					site.
				</Text>
			</Flex>

			<Flex direction="column" width="80%">
				<Heading>4 Modifications to the service and prices</Heading>

				<Text>
					We reserve the right at any time to modify or discontinue
					the Service (or any part or content thereof) without notice
					at any time for any reason including but not limited to any
					actual or suspected fraudulent or deceitful use of, or
					access to, the Service by you or where your use of or access
					to the Service is or is suspected to be for competitive
					intelligence purposes or otherwise than for legitimate, good
					faith commercial purposes. We shall not be liable to you or
					to any third-party for any modification, price change,
					suspension or discontinuance of the Service.
				</Text>
			</Flex>

			<Flex direction="column" width="80%">
				<Heading>5 Optional tools</Heading>

				<Text>
					We may provide you with access to third-party tools over
					which we neither monitor nor have any control nor input. You
					acknowledge and agree that we provide access to such tools
					”as is” and “as available” without any warranties,
					representations or conditions of any kind and without any
					endorsement. We shall have no liability whatsoever arising
					from or relating to your use of optional third-party tools.
					Any use by you of optional tools offered through the site is
					entirely at your own risk and discretion and you should
					ensure that you are familiar with and approve of the terms
					on which tools are provided by the relevant third-party
					provider(s). We may also, in the future, offer new services
					and/or features through the website (including, the release
					of new tools and resources). Such new features and/or
					services shall also be subject to these Terms of Service.
				</Text>
			</Flex>

			<Flex direction="column" width="80%">
				<Heading>6 Third party links</Heading>

				<Text>
					Certain content, products and services available via our
					Service may include materials from third-parties.
					Third-party links on this site may direct you to third-party
					websites that are not affiliated with us. We are not
					responsible for examining or evaluating the content or
					accuracy and we do not warrant and will not have any
					liability or responsibility for any third-party materials or
					websites, or for any other materials, products, or services
					of third-parties. We are not liable for any harm or damages
					related to the purchase or use of goods, services,
					resources, content, or any other transactions made in
					connection with any third-party websites. Please review
					carefully the third-party’s policies and practices and make
					sure you understand them before you engage in any
					transaction. Complaints, claims, concerns, or questions
					regarding third-party products should be directed to the
					third-party.
				</Text>
			</Flex>

			<Flex direction="column" width="80%">
				<Heading>7 Intellectual Property</Heading>

				<Text>
					We shall own and retain all right, title and interest in and
					to (a) the Services; (b) all improvements, enhancements or
					modifications to the Services which are carried out under or
					in connection with these Terms, whether by Admyral alone or
					jointly with you, and whether based on ideas or suggestions
					from you; (c) any software, applications, inventions or
					other technology developed in connection with any
					implementation services as set out in an Order Form
					(“Implementation Services”) or support, (d) all workflows
					that you creates using the Services (the "Stories"), and (e)
					all intellectual property rights related to any of the
					foregoing. Except as expressly stated herein, these Terms do
					not grant you any rights to, under or in, any patents,
					copyright, database right, trade secrets, trade names, trade
					marks (whether registered or unregistered), or any other
					rights or licenses in respect of the Services.
				</Text>
			</Flex>

			<Flex direction="column" width="80%">
				<Heading>8 Errors, inaccuracies and omissions</Heading>

				<Text>
					Occasionally there may be information on our site or in the
					Service that contains typographical errors, inaccuracies or
					omissions that may relate to product descriptions, pricing,
					promotions, offers and availability. We reserve the right to
					correct any errors, inaccuracies or omissions, and to change
					or update information or cancel orders if any information in
					the Service or on any related website is inaccurate at any
					time without prior notice (including after you have
					submitted your order). We undertake no obligation to update,
					amend or clarify information in the Service or on any
					related website, including without limitation, pricing
					information, except as required by law. No specified update
					or refresh date applied in the Service or on any related
					website, should be taken to indicate that all information in
					the Service or on any related website has been modified or
					updated.
				</Text>
			</Flex>

			<Flex direction="column" width="80%">
				<Heading>9 Prohibited uses</Heading>

				<Text>
					In addition to other prohibitions as set forth in the Terms
					of Service, you are prohibited from using the site or its
					content: (a) for fraudulent, deceitful or competitive
					intelligence purposes; (b) for any unlawful purpose; (c) to
					solicit others to perform or participate in any unlawful
					acts; (d) to violate any international, federal, provincial
					or state regulations, rules, laws, or local ordinances; (e)
					to infringe upon or violate our intellectual property rights
					or the intellectual property rights of others; (f) to
					harass, abuse, insult, harm, defame, slander, disparage,
					intimidate, or discriminate based on gender, sexual
					orientation, religion, ethnicity, race, age, national
					origin, or disability; (g) to submit false or misleading
					information; (h) to upload or transmit viruses or any other
					type of malicious code that will or may be used in any way
					that will affect the functionality or operation of the
					Service or of any related website, other websites, or the
					Internet; (i) to collect or track the personal information
					of others; (j) to spam, phish, pharm, pretext, spider,
					crawl, or scrape; (k) for any obscene or immoral purpose; or
					(l) to interfere with or circumvent the security features of
					the Service or any related website, other websites, or the
					Internet. We reserve the right to terminate your use of the
					Service or any related website for violating or suspected
					violation of any of the prohibited uses.
				</Text>
			</Flex>

			<Flex direction="column" width="80%">
				<Heading>
					10 Disclaimer of warranties, limitation of liability
				</Heading>

				<Text>
					We do not guarantee, represent or warrant that your use of
					our service will be uninterrupted, timely, secure or
					error-free. We do not warrant that the results that may be
					obtained from the use of the service will be accurate or
					reliable. In no case shall Admyral Technologies GmbH, our
					directors, officers, employees, affiliates, agents,
					contractors, interns, suppliers, service providers or
					licensors be liable for any injury, loss, claim, or any
					direct, indirect, incidental, punitive, special, or
					consequential damages of any kind, including, without
					limitation lost profits, lost revenue, lost savings, loss of
					data, replacement costs, or any similar damages, whether
					based in contract, tort (including negligence), strict
					liability or otherwise, arising from your use of any of the
					service or any products procured using the service, or for
					any other claim related in any way to your use of the
					service or any product, including, but not limited to, any
					errors or omissions in any content, or any loss or damage of
					any kind incurred as a result of the use of the service or
					any content (or product) posted, transmitted, or otherwise
					made available via the service, even if advised of their
					possibility. Because some states or jurisdictions do not
					allow the exclusion or the limitation of liability for
					consequential or incidental damages, in such states or
					jurisdictions, our liability shall be limited to the maximum
					extent permitted by law.
				</Text>
			</Flex>

			<Flex direction="column" width="80%">
				<Heading>11 Severability</Heading>

				<Text>
					In the event that any provision of these Terms of Service is
					determined to be unlawful, void or unenforceable, such
					provision shall nonetheless be enforceable to the fullest
					extent permitted by applicable law, and the unenforceable
					portion shall be deemed to be severed from these Terms of
					Service, such determination shall not affect the validity
					and enforceability of any other remaining provisions.
				</Text>
			</Flex>

			<Flex direction="column" width="80%">
				<Heading>12 Termination</Heading>

				<Text>
					These Terms of Service are effective unless and until
					terminated by either you or us. You may terminate these
					Terms of Service at any time by notifying us that you no
					longer wish to use our Services, or when you cease using our
					site. If in our sole judgment you fail, or we suspect that
					you have failed, to comply with any term or provision of
					these Terms of Service, we also may terminate this agreement
					at any time without notice and you will remain liable for
					all obligations due up to and including the date of
					termination; and/or accordingly will deny you access to our
					Services.
				</Text>
			</Flex>

			<Flex direction="column" width="80%">
				<Heading>13 Entire agreement</Heading>

				<Text>
					The failure of us to exercise or enforce any right or
					provision of these Terms of Service shall not constitute a
					waiver of such right or provision. These Terms of Service
					and any policies or operating rules posted by us on this
					site or in respect to The Service constitutes the entire
					agreement and understanding between you and us and govern
					your use of the Service, superseding any prior or
					contemporaneous agreements, communications and proposals,
					whether oral or written, between you and us (including, but
					not limited to, any prior versions of the Terms of Service).
					Any ambiguities in the interpretation of these Terms of
					Service shall not be construed against the drafting party.
				</Text>
			</Flex>

			<Flex direction="column" width="80%">
				<Heading>14 Changes to terms of service</Heading>

				<Text>
					You can review the most current version of the Terms of
					Service at any time at this page. We reserve the right, at
					our sole discretion, to update, change or replace any part
					of these Terms of Service by posting updates and changes to
					our website. It is your responsibility to check our website
					periodically for changes. Your continued use of or access to
					our website or the Service following the posting of any
					changes to these Terms of Service constitutes acceptance of
					those changes.
				</Text>
			</Flex>

			<Flex direction="column" width="80%">
				<Heading>15 Anonymous Data</Heading>

				<Text>
					The Services, in the normal course of operations, provides
					us with statistical data (such as product or feature usage
					and functionality metrics), which is anonymised and at times
					aggregated with other such anonymised data, so that it does
					not and cannot contain any information identifiable or
					attributable to you (“Anonymous Data”). To the extent that
					only Anonymous Data is collected by us, you agree that we
					may use, store, analyse, and disclose such Anonymous Data
					without your prior written consent. For the avoidance of
					doubt, any Anonymous Data that constitutes Customer Personal
					Data (as defined under the DPA), shall be processed in
					accordance with our DPA, GDPR and Applicable Data Protection
					Legislation (as defined under the DPA).
				</Text>
			</Flex>

			<Flex direction="column" width="80%">
				<Heading>16 Contact information</Heading>

				<Text>
					Questions about the Terms of Service should be sent to us at
					chris@admyral.dev.
				</Text>
			</Flex>
		</Flex>
	);
}
