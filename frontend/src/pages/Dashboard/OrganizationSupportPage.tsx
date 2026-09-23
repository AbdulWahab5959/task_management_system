import PageHeader from '../../components/dashboard/PageHeader';
import SupportWidget from '../../components/support/SupportWidget';
import { useTenant } from '../../hooks/useTenant';

export default function OrganizationSupportPage() {
  const { activeTenant } = useTenant();

  return (
    <div className="support-page-shell support-page-shell--chat">
      <PageHeader
        className="support-page-header"
        title="Support"
        description={`Get help with ${activeTenant?.name ?? 'your organization'} from one shared conversation.`}
      />
      <section className="support-page-conversation support-page-conversation--standalone" aria-label="Organization support conversation">
        <SupportWidget mode="page" />
      </section>
    </div>
  );
}
