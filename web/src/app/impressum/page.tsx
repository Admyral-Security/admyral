import LogoWithName from "@/components/icons/logo-with-name";
import { Flex, Heading, Text } from "@radix-ui/themes";
import Link from "next/link";

export default function ImpressumPage() {
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
				<Heading>Impressum</Heading>
			</Flex>

			<Flex direction="column" width="80%">
				<Text>Angaben gemäß § 5 TMG</Text>
			</Flex>

			<Flex direction="column" width="80%">
				<Text>Christopher Grittner</Text>
				<Text>Augustenstr. 74</Text>
				<Text>80333 München</Text>
				<Text>Vertreten durch:</Text>
				<Text>Christopher Grittner</Text>
				<Text>Daniel Grittner</Text>
				<Text>Registereintrag:</Text>
				<Text>Eintragung im Handelsregister.</Text>
				<Text>Registergericht: München</Text>
				<Text>Registernummer: HBR 292414</Text>
			</Flex>

			<Flex direction="column" width="80%">
				<Text>
					Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV:
				</Text>
				<Text>Christopher Grittner</Text>
				<Text>Augustenstr. 74</Text>
				<Text>80333 München</Text>
			</Flex>

			<Flex direction="column" width="80%">
				<Text>EU-Streitbeilegung</Text>
				<Text>
					Die Europäische Kommission stellt eine Plattform für die
					Online-Streitbeilegung (OS) zur Verfügung:
					https://ec.europa.eu/consumers/odr/.
				</Text>
				<Text>
					Unsere E-Mail-Adresse finden Sie oben im Impressum der
					Website.
				</Text>
			</Flex>

			<Flex direction="column" width="80%">
				<Text>
					Streitbeilegungsverfahren vor einer
					Verbraucherschlichtungsstelle
				</Text>
				<Text>
					Wir sind nicht bereit oder verpflichtet, an einem
					Streitbeilegungsverfahren vor einer
					Verbraucherschlichtungsstelle teilzunehmen.
				</Text>
			</Flex>

			<Flex direction="column" width="80%">
				<Text>Haftungsausschluss:</Text>
			</Flex>

			<Flex direction="column" width="80%">
				<Text>Haftung für Inhalte</Text>
				<br />
				<Text>
					Die Inhalte unserer Seiten wurden mit größter Sorgfalt
					erstellt. Für die Richtigkeit, Vollständigkeit und
					Aktualität der Inhalte können wir jedoch keine Gewähr
					übernehmen. Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG
					für eigene Inhalte auf diesen Seiten nach den allgemeinen
					Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als
					Diensteanbieter jedoch nicht verpflichtet, übermittelte oder
					gespeicherte fremde Informationen zu überwachen oder nach
					Umständen zu forschen, die auf eine rechtswidrige Tätigkeit
					hinweisen. Verpflichtungen zur Entfernung oder Sperrung der
					Nutzung von Informationen nach den allgemeinen Gesetzen
					bleiben hiervon unberührt. Eine diesbezügliche Haftung ist
					jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten
					Rechtsverletzung möglich. Bei Bekanntwerden von
					entsprechenden Rechtsverletzungen werden wir diese Inhalte
					umgehend entfernen.
				</Text>
				<br />
				<Text>Haftung für Links</Text>
				<br />
				<Text>
					Unser Angebot enthält Links zu externen Webseiten Dritter,
					auf deren Inhalte wir keinen Einfluss haben. Deshalb können
					wir für diese fremden Inhalte auch keine Gewähr übernehmen.
					Für die Inhalte der verlinkten Seiten ist stets der
					jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
					Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung
					auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte
					waren zum Zeitpunkt der Verlinkung nicht erkennbar. Eine
					permanente inhaltliche Kontrolle der verlinkten Seiten ist
					jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung
					nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen
					werden wir derartige Links umgehend entfernen.
				</Text>
				<br />
				<Text>Urheberrecht</Text>
				<br />
				<Text>
					Die durch die Seitenbetreiber erstellten Inhalte und Werke
					auf diesen Seiten unterliegen dem deutschen Urheberrecht.
					Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art
					der Verwertung außerhalb der Grenzen des Urheberrechtes
					bedürfen der schriftlichen Zustimmung des jeweiligen Autors
					bzw. Erstellers. Downloads und Kopien dieser Seite sind nur
					für den privaten, nicht kommerziellen Gebrauch gestattet.
					Soweit die Inhalte auf dieser Seite nicht vom Betreiber
					erstellt wurden, werden die Urheberrechte Dritter beachtet.
					Insbesondere werden Inhalte Dritter als solche
					gekennzeichnet. Sollten Sie trotzdem auf eine
					Urheberrechtsverletzung aufmerksam werden, bitten wir um
					einen entsprechenden Hinweis. Bei Bekanntwerden von
					Rechtsverletzungen werden wir derartige Inhalte umgehend
					entfernen.
				</Text>
				<br />
				<Text>Datenschutz</Text>
				<br />
				<Text>
					Die Nutzung unserer Webseite ist in der Regel ohne Angabe
					personenbezogener Daten möglich. Soweit auf unseren Seiten
					personenbezogene Daten (beispielsweise Name, Anschrift oder
					eMail-Adressen) erhoben werden, erfolgt dies, soweit
					möglich, stets auf freiwilliger Basis. Diese Daten werden
					ohne Ihre ausdrückliche Zustimmung nicht an Dritte
					weitergegeben. Wir weisen darauf hin, dass die
					Datenübertragung im Internet (z.B. bei der Kommunikation per
					E-Mail) Sicherheitslücken aufweisen kann. Ein lückenloser
					Schutz der Daten vor dem Zugriff durch Dritte ist nicht
					möglich. Der Nutzung von im Rahmen der Impressumspflicht
					veröffentlichten Kontaktdaten durch Dritte zur Übersendung
					von nicht ausdrücklich angeforderter Werbung und
					Informationsmaterialien wird hiermit ausdrücklich
					widersprochen. Die Betreiber der Seiten behalten sich
					ausdrücklich rechtliche Schritte im Falle der unverlangten
					Zusendung von Werbeinformationen, etwa durch Spam-Mails,
					vor.
				</Text>
				<br />
				<Text>Google Analytics</Text>
				<br />
				<Text>
					Diese Website benutzt Google Analytics, einen
					Webanalysedienst der Google Inc.
					(&apos;&apos;Google&apos;&apos;). Google Analytics verwendet
					sog. &apos;&apos;Cookies&apos;&apos;, Textdateien, die auf
					Ihrem Computer gespeichert werden und die eine Analyse der
					Benutzung der Website durch Sie ermöglicht. Die durch den
					Cookie erzeugten Informationen über Ihre Benutzung dieser
					Website (einschließlich Ihrer IP-Adresse) wird an einen
					Server von Google in den USA übertragen und dort
					gespeichert. Google wird diese Informationen benutzen, um
					Ihre Nutzung der Website auszuwerten, um Reports über die
					Websiteaktivitäten für die Websitebetreiber
					zusammenzustellen und um weitere mit der Websitenutzung und
					der Internetnutzung verbundene Dienstleistungen zu
					erbringen. Auch wird Google diese Informationen
					gegebenenfalls an Dritte übertragen, sofern dies gesetzlich
					vorgeschrieben oder soweit Dritte diese Daten im Auftrag von
					Google verarbeiten. Google wird in keinem Fall Ihre
					IP-Adresse mit anderen Daten der Google in Verbindung
					bringen. Sie können die Installation der Cookies durch eine
					entsprechende Einstellung Ihrer Browser Software verhindern;
					wir weisen Sie jedoch darauf hin, dass Sie in diesem Fall
					gegebenenfalls nicht sämtliche Funktionen dieser Website
					voll umfänglich nutzen können. Durch die Nutzung dieser
					Website erklären Sie sich mit der Bearbeitung der über Sie
					erhobenen Daten durch Google in der zuvor beschriebenen Art
					und Weise und zu dem zuvor benannten Zweck einverstanden.
				</Text>
				<br />
				<Text>Google AdSense</Text>
				<br />
				<Text>
					Diese Website benutzt Google Adsense, einen
					Webanzeigendienst der Google Inc., USA
					(&apos;&apos;Google&apos;&apos;). Google Adsense verwendet
					sog. &apos;&apos;Cookies&apos;&apos; (Textdateien), die auf
					Ihrem Computer gespeichert werden und die eine Analyse der
					Benutzung der Website durch Sie ermöglicht. Google Adsense
					verwendet auch sog. &apos;&apos;Web Beacons&apos;&apos;
					(kleine unsichtbare Grafiken) zur Sammlung von
					Informationen. Durch die Verwendung des Web Beacons können
					einfache Aktionen wie der Besucherverkehr auf der Webseite
					aufgezeichnet und gesammelt werden. Die durch den Cookie
					und/oder Web Beacon erzeugten Informationen über Ihre
					Benutzung dieser Website (einschließlich Ihrer IP-Adresse)
					werden an einen Server von Google in den USA übertragen und
					dort gespeichert. Google wird diese Informationen benutzen,
					um Ihre Nutzung der Website im Hinblick auf die Anzeigen
					auszuwerten, um Reports über die Websiteaktivitäten und
					Anzeigen für die Websitebetreiber zusammenzustellen und um
					weitere mit der Websitenutzung und der Internetnutzung
					verbundene Dienstleistungen zu erbringen. Auch wird Google
					diese Informationen gegebenenfalls an Dritte übertragen,
					sofern dies gesetzlich vorgeschrieben oder soweit Dritte
					diese Daten im Auftrag von Google verarbeiten. Google wird
					in keinem Fall Ihre IP-Adresse mit anderen Daten der Google
					in Verbindung bringen. Das Speichern von Cookies auf Ihrer
					Festplatte und die Anzeige von Web Beacons können Sie
					verhindern, indem Sie in Ihren Browser-Einstellungen
					&apos;&apos;keine Cookies akzeptieren&apos;&apos; wählen (Im
					MS Internet-Explorer unter &apos;&apos;Extras &gt;
					Internetoptionen &gt; Datenschutz &gt;
					Einstellung&apos;&apos;; im Firefox unter &apos;&apos;Extras
					&gt; Einstellungen &gt; Datenschutz &gt;
					Cookies&apos;&apos;); wir weisen Sie jedoch darauf hin, dass
					Sie in diesem Fall gegebenenfalls nicht sämtliche Funktionen
					dieser Website voll umfänglich nutzen können. Durch die
					Nutzung dieser Website erklären Sie sich mit der Bearbeitung
					der über Sie erhobenen Daten durch Google in der zuvor
					beschriebenen Art und Weise und zu dem zuvor benannten Zweck
					einverstanden.
				</Text>
			</Flex>
		</Flex>
	);
}
