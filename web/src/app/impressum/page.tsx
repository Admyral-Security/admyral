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
				<Text>Posthog</Text>
				<br />
				<Text>
					Wir verwenden auf unserer Plattform außerdem den Service von 
					PostHog, der von der PostHog, Inc., 965 Mission Street, San Francisco, 
					CA 94103, USA („Posthog“) bereitgestellt wird. PostHog hilft uns dabei, 
					die Nutzung unserer Plattform besser zu verstehen und verbessern zu können.
					Für die Analyse können die folgenden Daten verarbeitet werden: Name und 
					Nutzername, E-Mail-Adresse, IP- und MAC-Adresse, Browser Footprint, 
					geografische Informationen (Land, gebiet, Stadt) und Informationen über die 
					Nutzung der Plattform, wie Seitenaufrufe, Klicks oder Browsing-Verhalten. 
					Wir haben mit PostHog einen Auftragsverarbeitungsvertrag gemäß Art. 28 (3) 
					DSGVO geschlossen sowie die EU-Standardvertragsklauseln für die Übermittlung 
					personenbezogener Daten an Auftragsverarbeiter in Drittländern vom 04. Juni 
					2021 vereinbart. Die Datenschutzhinweise von PostHog können Sie hier 
					abrufen: https://posthog.com/privacy. 
					Die von PostHog genutzten Cookies haben eine Lebensdauer von höchstens zwei Jahren.
				</Text>
			</Flex>
		</Flex>
	);
}
