import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import { Share2, ShieldCheck } from 'lucide-react-native';
import { useWalletStore } from '@/state/wallet';
import { shortAddress } from '@/utils/format';
import { colors, fonts, radius, spacing } from '@/theme/tokens';
import { Card, CopyButton, Header, PressableScale, Screen, SegmentedControl, TextLabel, Toast } from '@/components/ui';

type Rail = 'Euro (EUR)' | 'Dollar (USD)' | 'Ledger X';
const accountAddress = 'ledgerx1q9p8v6d4c2x7m3n5k8h0t6w4s2j9p7f3d5g1c';

export default function Receive() {
  const params = useLocalSearchParams<{ rail?: string }>();
  const [rail, setRail] = useState<Rail>(params.rail === 'Ledger X' ? 'Ledger X' : 'Euro (EUR)');
  const [toast, setToast] = useState(false);
  const account = useWalletStore((state) => state.account);
  const tag = useWalletStore((state) => state.tag);
  const address = account?.address ?? accountAddress;
  const copy = async (value: string) => {
    await Clipboard.setStringAsync(value);
    setToast(true);
    setTimeout(() => setToast(false), 1600);
  };
  return (
    <Screen scroll style={styles.content}>
      <Header title="Recevoir" />
      <TextLabel size={25} weight={fonts.displayBold}>Recevez de l&rsquo;argent</TextLabel>
      <SegmentedControl options={['Euro (EUR)', 'Dollar (USD)', 'Ledger X']} selected={rail} onSelect={(value) => setRail(value as Rail)} />
      {rail === 'Euro (EUR)' ? (
        <>
          <Card style={styles.bankCard}><View style={styles.bankHead}><View style={styles.bankBadge}><TextLabel size={13} weight={fonts.bodyBold} color={colors.text}>€</TextLabel></View><View><TextLabel size={14} weight={fonts.bodySemi}>Coordonnées SEPA</TextLabel><TextLabel size={11} color={colors.textDim}>Virements en euros</TextLabel></View><ShieldCheck size={17} color={colors.success} /></View></Card>
          <Card style={styles.fields}>
            <BankField label="IBAN" value="FR76 3000 6000 0112 3456 7890 189" onCopy={copy} />
            <BankField label="BIC / SWIFT" value="AGRIFRPP" onCopy={copy} />
            <BankField label="Bénéficiaire" value={useWalletStore.getState().displayName} onCopy={copy} />
            <BankField label="Banque partenaire" value="Ledger X Europe · Paris" onCopy={copy} />
          </Card>
          <Card style={styles.note}><ShieldCheck size={16} color={colors.accent} /><TextLabel size={12} color={colors.textMuted} style={{ flex: 1 }}>Les virements sont crédités automatiquement après confirmation de la banque partenaire.</TextLabel></Card>
        </>
      ) : rail === 'Dollar (USD)' ? (
        <>
          <Card style={styles.bankCard}><View style={styles.bankHead}><View style={[styles.bankBadge, styles.usdBadge]}><TextLabel size={13} weight={fonts.bodyBold}>$</TextLabel></View><View><TextLabel size={14} weight={fonts.bodySemi}>Coordonnées ACH</TextLabel><TextLabel size={11} color={colors.textDim}>Virements en dollars US</TextLabel></View><ShieldCheck size={17} color={colors.success} /></View></Card>
          <Card style={styles.fields}>
            <BankField label="ACH routing number" value="021000021" onCopy={copy} />
            <BankField label="Account number" value="7845 0921 6073" onCopy={copy} />
            <BankField label="Account type" value="Checking" onCopy={copy} />
            <BankField label="Bénéficiaire" value={useWalletStore.getState().displayName} onCopy={copy} />
            <BankField label="Banque" value="Ledger X US · New York" onCopy={copy} />
          </Card>
        </>
      ) : (
        <>
          <Card style={styles.qrCard}>
            <View style={styles.qrFrame}><QRCode value={`ledgerx:${tag || 'amina'}:${address}`} size={174} color={colors.ink} backgroundColor="#ffffff" /></View>
            <TextLabel size={19} weight={fonts.displayBold}>@{tag || 'amina'}</TextLabel>
            <TextLabel size={12} color={colors.textMuted} style={styles.center}>Scannez ce QR code pour recevoir des fonds.</TextLabel>
          </Card>
          <Card style={styles.fields}>
            <BankField label="Votre tag Ledger X" value={`@${tag || 'amina'}`} onCopy={copy} />
            <BankField label="Smart account Cosmos" value={shortAddress(address)} onCopy={() => copy(address)} />
            <TextLabel size={11} color={colors.textDim}>Adresse bech32 · x/auth · frais de réception offerts</TextLabel>
          </Card>
          <PressableScale onPress={() => copy(`@${tag}`)} style={styles.shareButton}><Share2 color={colors.accent} size={17} /><TextLabel size={13} color={colors.accent} weight={fonts.bodySemi}>Partager mon QR code</TextLabel></PressableScale>
        </>
      )}
      <Toast message="Copié" visible={toast} />
    </Screen>
  );
}

function BankField({ label, value, onCopy }: { label: string; value: string; onCopy: (value: string) => void }) {
  return (
    <View style={styles.field}>
      <View style={{ flex: 1, gap: 5 }}><TextLabel size={11} color={colors.textDim}>{label}</TextLabel><TextLabel size={13} weight={fonts.bodySemi}>{value}</TextLabel></View>
      <CopyButton value={value} onCopy={onCopy} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing(1), gap: spacing(3) },
  bankCard: { padding: spacing(3) },
  bankHead: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  bankBadge: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  usdBadge: { backgroundColor: colors.success },
  fields: { paddingVertical: spacing(1), paddingHorizontal: spacing(3) },
  field: { minHeight: 64, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  note: { flexDirection: 'row', alignItems: 'center', gap: spacing(2) },
  qrCard: { alignItems: 'center', gap: spacing(2), paddingVertical: spacing(5) },
  qrFrame: { padding: spacing(3), backgroundColor: colors.paper, borderRadius: radius.lg },
  center: { textAlign: 'center' },
  shareButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, padding: spacing(2) },
});
