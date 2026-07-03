import { UpdateList } from '../components/updates/UpdateList';
import { useAnimateOnMount } from '../utils/animations';

export default function UpdatesPage() {
  const anim = useAnimateOnMount({ variant: 'fadeIn', duration: 300 });

  return (
    <div style={anim.style}>
      <UpdateList />
    </div>
  );
}
